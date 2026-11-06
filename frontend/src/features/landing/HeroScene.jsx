import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Float, Lightformer, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

/**
 * A procedurally animated walking skeleton (MediaPipe-style 33-landmark topology)
 * in front of a frosted-glass shield, with a scanning ring — the product idea in one image.
 */
const JOINTS = ['head', 'neck', 'lsho', 'rsho', 'lelb', 'relb', 'lwri', 'rwri', 'pelvis', 'lhip', 'rhip', 'lknee', 'rknee', 'lank', 'rank', 'ltoe', 'rtoe']
const BONES = [
  ['head', 'neck'], ['neck', 'lsho'], ['neck', 'rsho'], ['lsho', 'lelb'], ['lelb', 'lwri'], ['rsho', 'relb'], ['relb', 'rwri'],
  ['neck', 'pelvis'], ['pelvis', 'lhip'], ['pelvis', 'rhip'], ['lhip', 'lknee'], ['lknee', 'lank'], ['rhip', 'rknee'], ['rknee', 'rank'],
  ['lank', 'ltoe'], ['rank', 'rtoe'], ['lsho', 'lhip'], ['rsho', 'rhip'],
]
const UP = new THREE.Vector3(0, 1, 0)

function pose(t, out) {
  const w = t * 3.2
  const bob = Math.abs(Math.sin(w)) * 0.035
  const pelvis = new THREE.Vector3(0, 0.98 + bob, 0)
  const sway = Math.sin(w) * 0.02
  const set = (k, x, y, z) => out[k].set(x, y, z)
  set('pelvis', pelvis.x + sway, pelvis.y, 0)
  set('neck', sway * 0.6, pelvis.y + 0.56, 0.03)
  set('head', sway * 0.5, pelvis.y + 0.78, 0.05)
  const shoulderW = 0.2, hipW = 0.11
  set('lsho', -shoulderW + sway * 0.6, pelvis.y + 0.52, 0.02)
  set('rsho', shoulderW + sway * 0.6, pelvis.y + 0.52, 0.02)
  set('lhip', -hipW + sway, pelvis.y, 0)
  set('rhip', hipW + sway, pelvis.y, 0)
  const leg = (side, phase) => {
    const hip = out[`${side}hip`]
    const th = Math.sin(w + phase) * 0.48
    const knee = Math.max(0, Math.sin(w + phase + Math.PI / 2)) * 0.75 + 0.06
    const thigh = 0.46, shin = 0.46
    const kx = hip.x, ky = hip.y - Math.cos(th) * thigh, kz = hip.z + Math.sin(th) * thigh
    const a = th - knee
    out[`${side}knee`].set(kx, ky, kz)
    out[`${side}ank`].set(kx, ky - Math.cos(a) * shin, kz + Math.sin(a) * shin)
    out[`${side}toe`].set(kx, ky - Math.cos(a) * shin - 0.03, kz + Math.sin(a) * shin + 0.13)
  }
  leg('l', 0)
  leg('r', Math.PI)
  const arm = (side, phase) => {
    const sh = out[`${side}sho`]
    const s = Math.sin(w + phase) * 0.42
    const ex = sh.x + (side === 'l' ? -0.03 : 0.03), ey = sh.y - Math.cos(s) * 0.29, ez = sh.z + Math.sin(s) * 0.29
    const f = s + 0.35
    out[`${side}elb`].set(ex, ey, ez)
    // tiny high-frequency wobble on the right wrist = the "tremor" we detect
    const tremor = side === 'r' ? Math.sin(t * 34) * 0.006 : 0
    out[`${side}wri`].set(ex + tremor, ey - Math.cos(f) * 0.27, ez + Math.sin(f) * 0.27)
  }
  arm('l', Math.PI)
  arm('r', 0)
}

function Skeleton() {
  const group = useRef()
  const joints = useRef({})
  const bones = useRef([])
  const pts = useMemo(() => Object.fromEntries(JOINTS.map((k) => [k, new THREE.Vector3()])), [])
  const tmp = useMemo(() => ({ mid: new THREE.Vector3(), dir: new THREE.Vector3(), q: new THREE.Quaternion() }), [])

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime()
    pose(t, pts)
    for (const k of JOINTS) joints.current[k]?.position.copy(pts[k])
    BONES.forEach(([a, b], i) => {
      const m = bones.current[i]
      if (!m) return
      tmp.mid.addVectors(pts[a], pts[b]).multiplyScalar(0.5)
      tmp.dir.subVectors(pts[b], pts[a])
      const len = tmp.dir.length()
      tmp.q.setFromUnitVectors(UP, tmp.dir.normalize())
      m.position.copy(tmp.mid)
      m.quaternion.copy(tmp.q)
      m.scale.set(1, len, 1)
    })
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -0.55 + pointer.x * 0.35, 0.05)
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * -0.08, 0.05)
    }
  })

  return (
    <group ref={group} position={[0, -1.05, 0]}>
      {BONES.map((b, i) => (
        <mesh key={b.join('-')} ref={(el) => (bones.current[i] = el)} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 1, 12]} />
          <meshPhysicalMaterial color={i < 7 ? '#D08560' : '#3A6652'} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} />
        </mesh>
      ))}
      {JOINTS.map((k) => (
        <mesh key={k} ref={(el) => (joints.current[k] = el)} castShadow>
          <sphereGeometry args={[k === 'head' ? 0.11 : k === 'rwri' ? 0.05 : 0.042, 24, 24]} />
          <meshPhysicalMaterial color={k === 'rwri' ? '#C06D48' : k === 'head' ? '#ffffff' : '#F8F4EC'} roughness={0.15} clearcoat={1} metalness={0.05} />
        </mesh>
      ))}
    </group>
  )
}

function Shield() {
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 1.25)
    s.bezierCurveTo(0.45, 1.05, 0.85, 1.02, 1.0, 0.98)
    s.lineTo(1.0, 0.2)
    s.bezierCurveTo(1.0, -0.55, 0.55, -1.05, 0, -1.3)
    s.bezierCurveTo(-0.55, -1.05, -1.0, -0.55, -1.0, 0.2)
    s.lineTo(-1.0, 0.98)
    s.bezierCurveTo(-0.85, 1.02, -0.45, 1.05, 0, 1.25)
    return s
  }, [])
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.12
  })
  return (
    <group ref={ref} position={[0, 0.05, -0.75]} scale={1.18}>
      <mesh>
        <extrudeGeometry args={[shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 8, curveSegments: 48 }]} />
        <meshPhysicalMaterial color="#E1EBE3" roughness={0.08} metalness={0} clearcoat={1} clearcoatRoughness={0.05} transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  )
}

function ScanRing() {
  const ref = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!ref.current) return
    ref.current.position.y = -1 + ((Math.sin(t * 0.9) + 1) / 2) * 1.85
    ref.current.material.opacity = 0.35 + Math.sin(t * 1.8) * 0.1
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.6, 64]} />
      <meshBasicMaterial color="#6E9B83" transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Orbs() {
  const orbs = [
    { p: [-1.05, 0.8, 0.2], c: '#DFA180', s: 0.12 }, { p: [1.05, 0.45, 0.3], c: '#B6AAC5', s: 0.15 },
    { p: [0.95, -0.65, 0.6], c: '#9AB4C1', s: 0.09 }, { p: [-0.95, -0.4, 0.5], c: '#ECD99C', s: 0.1 },
  ]
  return orbs.map((o, i) => (
    <Float key={i} speed={1.6 + i * 0.3} rotationIntensity={0.6} floatIntensity={1.4}>
      <mesh position={o.p}>
        <sphereGeometry args={[o.s, 32, 32]} />
        <meshPhysicalMaterial color={o.c} roughness={0.1} clearcoat={1} transmission={0.25} thickness={0.4} />
      </mesh>
    </Float>
  ))
}

function Plinth() {
  return (
    <RoundedBox args={[2.2, 0.06, 1.3]} radius={0.03} position={[0, -1.1, 0]} receiveShadow>
      <meshPhysicalMaterial color="#FFFFFF" roughness={0.35} clearcoat={0.6} />
    </RoundedBox>
  )
}

export default function HeroScene() {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 0.15, 4.1], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 1, -2]} intensity={0.5} color="#ECC4AB" />
      <Shield />
      <Skeleton />
      <ScanRing />

      <Plinth />
      <ContactShadows position={[0, -1.07, 0]} opacity={0.35} scale={5} blur={2.6} far={2} color="#2F5444" />
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 3, 2]} scale={[6, 1.5, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-4, 0, 1]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} color="#E1EBE3" />
        <Lightformer intensity={1.2} position={[4, 0.5, 0]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} color="#F6E2D5" />
      </Environment>
    </Canvas>
  )
}
