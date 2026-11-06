import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'

/**
 * A fully code-generated 3D human (no external model or image files).
 *
 * Body parts are built from smooth lathe profiles (tapered limbs, shaped torso),
 * arranged in a real joint hierarchy (pelvis → spine → shoulders → elbows → wrists,
 * hips → knees → ankles) and animated procedurally:
 *   walk  — gait cycle with knee flexion, arm swing, pelvic bob/rotation
 *   stand — quiet standing with breathing and postural sway
 *   hands — arms held forward (postural-tremor test) with a fine wrist tremor
 * Sage joint markers show the landmarks MedoShield's pose AI tracks.
 */

const C = {
  skin: '#D8A68A',
  skinShade: '#C99579',
  shirt: '#F2ECE1',
  pants: '#4A7C64',
  shoe: '#2B2622',
  sole: '#EDE6DA',
  hair: '#3A2E28',
  marker: '#2F5444',
}

/* Smooth tapered capsule hanging down from its origin (-Y), revolved around Y. */
function limbGeometry(len, r1, r2, seg = 28) {
  const pts = []
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2)
    pts.push(new THREE.Vector2(Math.sin(a) * r1, Math.cos(a) * r1 * 0.6))
  }
  for (let i = 1; i <= 10; i++) {
    const t = i / 10
    // gentle muscle bulge in the upper third
    const bulge = Math.sin(Math.min(1, t * 1.6) * Math.PI) * (r1 - r2) * 0.18
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(r1, r2, t) + bulge, -len * t))
  }
  for (let i = 1; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * (Math.PI / 2)
    pts.push(new THREE.Vector2(Math.sin(a) * r2, -len + Math.cos(a) * r2 * 0.6))
  }
  const g = new THREE.LatheGeometry(pts, seg)
  g.computeVertexNormals()
  return g
}

/* Lathe from a list of [radius, y] pairs (closed top & bottom). */
function bodyGeometry(profile, seg = 40) {
  const pts = [new THREE.Vector2(0, profile[0][1]), ...profile.map(([r, y]) => new THREE.Vector2(r, y)), new THREE.Vector2(0, profile.at(-1)[1])]
  const g = new THREE.LatheGeometry(pts, seg)
  g.computeVertexNormals()
  return g
}

function useMaterials() {
  return useMemo(() => ({
    skin: new THREE.MeshPhysicalMaterial({ color: C.skin, roughness: 0.48, sheen: 0.4, sheenColor: new THREE.Color('#F4D3C0'), clearcoat: 0.08 }),
    shirt: new THREE.MeshPhysicalMaterial({ color: C.shirt, roughness: 0.82, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color('#FFFFFF') }),
    pants: new THREE.MeshPhysicalMaterial({ color: C.pants, roughness: 0.78, sheen: 0.6, sheenColor: new THREE.Color('#9DBDA9') }),
    shoe: new THREE.MeshPhysicalMaterial({ color: C.shoe, roughness: 0.35, clearcoat: 0.5 }),
    sole: new THREE.MeshStandardMaterial({ color: C.sole, roughness: 0.7 }),
    hair: new THREE.MeshPhysicalMaterial({ color: C.hair, roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#7A6458') }),
    marker: new THREE.MeshBasicMaterial({ color: C.marker, transparent: true, opacity: 0.85, depthTest: false }),
    ring: new THREE.MeshBasicMaterial({ color: '#FFFDF9', transparent: true, opacity: 0.9, depthTest: false }),
  }), [])
}

function Marker({ show, m, size = 0.014 }) {
  if (!show) return null
  return (
    <group renderOrder={10}>
      <mesh material={m.ring} renderOrder={10}><sphereGeometry args={[size * 1.55, 16, 16]} /></mesh>
      <mesh material={m.marker} renderOrder={11}><sphereGeometry args={[size, 16, 16]} /></mesh>
    </group>
  )
}

function Human({ pose = 'walk', markers = true, speed = 1 }) {
  const m = useMaterials()
  const geo = useMemo(() => ({
    pelvis: bodyGeometry([[0.09, -0.085], [0.145, -0.05], [0.168, 0.0], [0.168, 0.07], [0.156, 0.14]]),
    torso: bodyGeometry([[0.172, -0.07], [0.165, 0.0], [0.15, 0.1], [0.156, 0.2], [0.178, 0.31], [0.184, 0.4], [0.176, 0.46], [0.142, 0.52], [0.075, 0.565]]),
    neck: limbGeometry(0.1, 0.045, 0.05),
    upperArm: limbGeometry(0.29, 0.052, 0.043),
    sleeve: limbGeometry(0.15, 0.06, 0.056),
    forearm: limbGeometry(0.26, 0.04, 0.03),
    thigh: limbGeometry(0.45, 0.086, 0.056),
    shin: limbGeometry(0.43, 0.056, 0.04),
    head: new THREE.SphereGeometry(0.1, 40, 40),
    hair: new THREE.SphereGeometry(0.107, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hand: new THREE.SphereGeometry(0.038, 24, 24),
    thumb: limbGeometry(0.045, 0.013, 0.011, 12),
    belt: new THREE.TorusGeometry(0.158, 0.012, 12, 48),
    collar: new THREE.TorusGeometry(0.058, 0.014, 12, 32),
    ear: new THREE.SphereGeometry(0.018, 16, 16),
    nose: new THREE.SphereGeometry(0.014, 16, 16),
    foot: new THREE.CapsuleGeometry(0.04, 0.11, 8, 20),
    shoulder: new THREE.SphereGeometry(0.056, 24, 24),
  }), [])

  const r = {
    root: useRef(), pelvis: useRef(), spine: useRef(), neck: useRef(), head: useRef(),
    shL: useRef(), shR: useRef(), elL: useRef(), elR: useRef(), wrL: useRef(), wrR: useRef(),
    hipL: useRef(), hipR: useRef(), knL: useRef(), knR: useRef(), anL: useRef(), anR: useRef(),
  }

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed
    const s = (ref, x = 0, y = 0, z = 0) => ref.current && ref.current.rotation.set(x, y, z)
    if (pose === 'walk') {
      const w = t * 4.4
      const sin = Math.sin(w)
      r.pelvis.current.position.y = 0.985 + Math.abs(Math.cos(w)) * 0.022
      s(r.pelvis, 0, sin * 0.09, Math.cos(w) * 0.025)
      s(r.spine, 0.05, -sin * 0.13, -Math.cos(w) * 0.02)
      s(r.head, -0.04, sin * 0.04, 0)
      // legs: hip flexion/extension, knee flexion in swing, ankle roll
      const legs = [[r.hipL, r.knL, r.anL, 0], [r.hipR, r.knR, r.anR, Math.PI]]
      for (const [hip, knee, ank, ph] of legs) {
        const p = w + ph
        s(hip, -Math.sin(p) * 0.42, 0, 0)
        s(knee, Math.max(0, Math.sin(p + 1.2)) * 0.95 + 0.05, 0, 0)
        s(ank, Math.sin(p) * 0.25 - 0.05, 0, 0)
      }
      // arms swing opposite to legs
      s(r.shL, Math.sin(w) * 0.38, 0, 0.07)
      s(r.shR, -Math.sin(w) * 0.38, 0, -0.07)
      s(r.elL, -0.32 - Math.max(0, -Math.sin(w)) * 0.25, 0, 0)
      s(r.elR, -0.32 - Math.max(0, Math.sin(w)) * 0.25, 0, 0)
      s(r.wrL); s(r.wrR)
    } else if (pose === 'stand') {
      const b = Math.sin(t * 1.6)
      r.pelvis.current.position.y = 0.985
      s(r.pelvis, 0, 0, Math.sin(t * 0.7) * 0.012)
      s(r.spine, 0.02 + b * 0.012, 0, -Math.sin(t * 0.7) * 0.015)
      s(r.head, Math.sin(t * 0.5) * 0.03, Math.sin(t * 0.33) * 0.08, 0)
      for (const [hip, knee, ank, sgn] of [[r.hipL, r.knL, r.anL, 1], [r.hipR, r.knR, r.anR, -1]]) {
        s(hip, 0, 0, sgn * 0.035)
        s(knee, 0.03, 0, 0)
        s(ank, -0.02, 0, -sgn * 0.035)
      }
      s(r.shL, 0.04, 0, 0.1 + b * 0.01); s(r.shR, 0.04, 0, -0.1 - b * 0.01)
      s(r.elL, -0.12, 0, 0); s(r.elR, -0.12, 0, 0)
      s(r.wrL); s(r.wrR)
    } else {
      // hands out: shoulder flexion ~90°, fine 5 Hz tremor on the right wrist
      const tremor = Math.sin(t * 31) * 0.06
      r.pelvis.current.position.y = 0.985
      s(r.pelvis); s(r.spine, -0.02, 0, 0); s(r.head, 0.05, 0, 0)
      for (const [hip, knee, ank, sgn] of [[r.hipL, r.knL, r.anL, 1], [r.hipR, r.knR, r.anR, -1]]) {
        s(hip, 0, 0, sgn * 0.04); s(knee, 0.02, 0, 0); s(ank, 0, 0, -sgn * 0.04)
      }
      const breathe = Math.sin(t * 1.4) * 0.015
      s(r.shL, -1.5 + breathe, 0.12, 0.05); s(r.shR, -1.5 + breathe, -0.12, -0.05)
      s(r.elL, -0.04, 0, 0); s(r.elR, -0.04, 0, 0)
      s(r.wrL, 0.05, 0, 0); s(r.wrR, 0.05 + tremor, 0, tremor * 0.5)
    }
  })

  const leg = (side) => {
    const x = side === 'L' ? -0.08 : 0.08
    const [hip, knee, ank] = side === 'L' ? [r.hipL, r.knL, r.anL] : [r.hipR, r.knR, r.anR]
    return (
      <group ref={hip} position={[x, -0.02, 0]}>
        <mesh geometry={geo.thigh} material={m.pants} castShadow />
        <Marker show={markers} m={m} />
        <group ref={knee} position={[0, -0.45, 0]}>
          <mesh geometry={geo.shin} material={m.pants} castShadow />
          <Marker show={markers} m={m} />
          <group ref={ank} position={[0, -0.43, 0]}>
            <mesh geometry={geo.foot} material={m.shoe} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.025, 0.05]} scale={[1.05, 1, 0.85]} castShadow />
            <mesh material={m.sole} position={[0, -0.062, 0.05]} scale={[0.085, 0.012, 0.205]}><boxGeometry args={[1, 1, 1]} /></mesh>
            <Marker show={markers} m={m} size={0.012} />
          </group>
        </group>
      </group>
    )
  }

  const arm = (side) => {
    const x = side === 'L' ? -0.2 : 0.2
    const [sh, el, wr] = side === 'L' ? [r.shL, r.elL, r.wrL] : [r.shR, r.elR, r.wrR]
    return (
      <group ref={sh} position={[x, 0.465, 0]}>
        <mesh geometry={geo.shoulder} material={m.shirt} castShadow />
        <mesh geometry={geo.upperArm} material={m.skin} castShadow />
        <mesh geometry={geo.sleeve} material={m.shirt} castShadow />
        <Marker show={markers} m={m} />
        <group ref={el} position={[0, -0.29, 0]}>
          <mesh geometry={geo.forearm} material={m.skin} castShadow />
          <Marker show={markers} m={m} size={0.012} />
          <group ref={wr} position={[0, -0.26, 0]}>
            <mesh geometry={geo.hand} material={m.skin} position={[0, -0.05, 0.004]} scale={[0.78, 1.5, 0.5]} castShadow />
            <mesh geometry={geo.thumb} material={m.skin} position={[side === 'L' ? 0.022 : -0.022, -0.02, 0.02]} rotation={[0.5, 0, side === 'L' ? 0.5 : -0.5]} />
            <Marker show={markers} m={m} size={0.012} />
          </group>
        </group>
      </group>
    )
  }

  return (
    <group ref={r.root}>
      <group ref={r.pelvis} position={[0, 0.985, 0]}>
        <mesh geometry={geo.pelvis} material={m.pants} scale={[1, 1, 0.66]} castShadow />
        <mesh geometry={geo.belt} material={m.shoe} position={[0, 0.115, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.74, 1]} />
        {leg('L')}
        {leg('R')}
        <group ref={r.spine} position={[0, 0.1, 0]}>
          <mesh geometry={geo.torso} material={m.shirt} scale={[1, 1, 0.68]} castShadow />
          <mesh geometry={geo.collar} material={m.shirt} position={[0, 0.565, 0.005]} rotation={[Math.PI / 2 + 0.25, 0, 0]} scale={[1, 0.8, 1]} />
          {arm('L')}
          {arm('R')}
          <group ref={r.neck} position={[0, 0.6, 0]} rotation={[Math.PI, 0, 0]}>
            <mesh geometry={geo.neck} material={m.skin} />
          </group>
          <group ref={r.head} position={[0, 0.74, 0.01]}>
            <mesh geometry={geo.head} material={m.skin} scale={[0.92, 1.12, 1]} castShadow />
            <mesh geometry={geo.hair} material={m.hair} scale={[0.95, 1.1, 1.04]} position={[0, 0.012, -0.008]} rotation={[-0.42, 0, 0]} castShadow />
            <mesh geometry={geo.ear} material={m.skin} position={[-0.092, 0, -0.005]} scale={[0.6, 1.2, 1]} />
            <mesh geometry={geo.ear} material={m.skin} position={[0.092, 0, -0.005]} scale={[0.6, 1.2, 1]} />
            <mesh geometry={geo.nose} material={m.skin} position={[0, -0.012, 0.1]} scale={[0.8, 1.3, 1]} />
            {markers && <group position={[0, 0, 0.11]}><Marker show m={m} size={0.011} /></group>}
          </group>
        </group>
      </group>
    </group>
  )
}

function Ground({ moving }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (moving && ref.current) ref.current.position.z = (ref.current.position.z - dt * 0.55) % 0.4
  })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <circleGeometry args={[0.9, 64]} />
        <meshStandardMaterial color="#F3EDE2" roughness={1} />
      </mesh>
      {moving && (
        <group ref={ref}>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -1.6 + i * 0.4]}>
              <planeGeometry args={[0.035, 0.16]} />
              <meshBasicMaterial color="#C5D8CB" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

const VIEWS = {
  walk: { dir: [0.9, 0.14, 0.42], target: [0, 0.97, 0], height: 2.3 },
  stand: { dir: [0.38, 0.12, 0.92], target: [0, 0.97, 0], height: 2.25 },
  hands: { dir: [0.78, 0.16, 0.6], target: [0, 0.98, 0.15], height: 2.3 },
}
function cameraFor(v, fov) {
  const d = new THREE.Vector3(...v.dir).normalize()
  const dist = v.height / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2))
  return d.multiplyScalar(dist).add(new THREE.Vector3(...v.target)).toArray()
}

function Rig({ target }) {
  useFrame(({ camera, pointer }) => {
    camera.position.x += (camera.userData.base[0] + pointer.x * 0.3 - camera.position.x) * 0.05
    camera.position.y += (camera.userData.base[1] + pointer.y * 0.15 - camera.position.y) * 0.05
    camera.lookAt(...target)
  })
  return null
}

/**
 * <HumanCanvas pose="walk|stand|hands" markers className />
 * Transparent background — place it on any light surface.
 */
export default function HumanCanvas({ pose = 'walk', markers = true, className, fov = 28 }) {
  const v = VIEWS[pose] || VIEWS.walk
  const pos = cameraFor(v, fov)
  return (
    <div className={className} aria-hidden>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: pos, fov }}
        onCreated={({ camera }) => {
          camera.userData.base = [...pos]
          camera.lookAt(...v.target)
        }}
      >
        <hemisphereLight args={['#FFFDF9', '#E8DCC8', 0.75]} />
        <directionalLight position={[2.5, 4, 2.5]} intensity={1.9} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
        <directionalLight position={[-2.5, 1.5, -1.5]} intensity={0.55} color="#F6E2D5" />
        <Rig target={v.target} />
        <Human pose={pose} markers={markers} />
        <Ground moving={pose === 'walk'} />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.32} scale={2.4} blur={2.4} far={1.4} color="#3B2F22" />
        <Environment resolution={128}>
          <Lightformer intensity={1.6} position={[0, 3, 2]} scale={[5, 1.5, 1]} color="#FFFFFF" />
          <Lightformer intensity={0.9} position={[-3, 1, 1]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} color="#E1EBE3" />
          <Lightformer intensity={0.8} position={[3, 1, 0]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} color="#F6E2D5" />
        </Environment>
      </Canvas>
    </div>
  )
}
