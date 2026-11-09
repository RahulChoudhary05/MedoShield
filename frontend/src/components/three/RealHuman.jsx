import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls, useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * Pose the target skeleton into the source's rest posture (e.g. A-pose → T-pose) by rotating each
 * bone so it points the same way as the matching source bone. Without this, rest-pose differences
 * are added on top of the motion (arms swinging behind the body).
 */
const CHILD_PREF = /Neck$|Head$|Spine\d?$|Arm$|ForeArm$|Hand$|HandMiddle1$|UpLeg$|Leg$|Foot$|ToeBase$/
function alignRestPose(srcRoot, tgtRoot, sb, bare) {
  const order = []
  tgtRoot.traverse((o) => { if (o.isBone && sb[bare(o.name)]) order.push(o) })
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (const bone of order) {
    if (/Hips$/.test(bone.name)) continue
    const kids = bone.children.filter((c) => c.isBone && sb[bare(c.name)])
    const child = (/Spine2$/.test(bone.name) && kids.find((c) => /Neck$/.test(c.name))) || kids.find((c) => CHILD_PREF.test(c.name)) || kids[0]
    if (!child) continue
    const sB = sb[bare(bone.name)]
    const sC = sb[bare(child.name)]
    const ds = sC.getWorldPosition(a).sub(sB.getWorldPosition(b)).normalize().clone()
    const dt = child.getWorldPosition(a).sub(bone.getWorldPosition(b)).normalize().clone()
    if (!Number.isFinite(ds.x) || !Number.isFinite(dt.x) || ds.lengthSq() < 0.5 || dt.lengthSq() < 0.5) continue
    const delta = new THREE.Quaternion().setFromUnitVectors(dt, ds)
    const world = delta.multiply(bone.getWorldQuaternion(new THREE.Quaternion()))
    const parentW = bone.parent.getWorldQuaternion(new THREE.Quaternion())
    bone.quaternion.copy(parentW.invert().multiply(world))
    bone.updateMatrixWorld(true)
  }
}

/**
 * Retarget a clip between two rigs that share bone names but not rest poses / scale:
 * target world rotation = source world rotation × inverse(source rest) × target rest,
 * then converted back to local rotations along the target hierarchy. Sampled at `fps`.
 */
function retargetWorld(srcRoot, tgtRoot, clip, fps = 30) {
  const sb = {}
  const tb = {}
  const bare = (n) => n.replace(/^mixamorig:?/, '')
  srcRoot.traverse((o) => { if (o.isBone || /^mixamorig/.test(o.name)) sb[bare(o.name)] = o })
  tgtRoot.traverse((o) => { if (o.isBone) tb[bare(o.name)] = o })
  srcRoot.updateMatrixWorld(true)
  tgtRoot.updateMatrixWorld(true)
  alignRestPose(srcRoot, tgtRoot, sb, bare)
  const pairs = Object.keys(tb).filter((n) => sb[n]).map((n) => ({
    n, s: sb[n], t: tb[n],
    Rs: sb[n].getWorldQuaternion(new THREE.Quaternion()),
    Rt: tb[n].getWorldQuaternion(new THREE.Quaternion()),
    Pt: tb[n].parent ? tb[n].parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion(),
  }))
  const mixer = new THREE.AnimationMixer(srcRoot)
  mixer.clipAction(clip).play()
  const frames = Math.max(2, Math.round(clip.duration * fps))
  const dt = clip.duration / (frames - 1)
  const times = new Float32Array(frames)
  const vals = pairs.map(() => new Float32Array(frames * 4))
  const Qt = {}
  const qs = new THREE.Quaternion()
  const tmp = new THREE.Quaternion()
  for (let f = 0; f < frames; f++) {
    mixer.setTime(f * dt)
    srcRoot.updateMatrixWorld(true)
    times[f] = f * dt
    for (const p of pairs) {
      p.s.getWorldQuaternion(qs)
      Qt[p.n] = qs.clone().multiply(p.Rs.clone().invert()).multiply(p.Rt)
    }
    pairs.forEach((p, i) => {
      const parentW = Qt[bare(p.t.parent?.name || '')] || p.Pt
      tmp.copy(parentW).invert().multiply(Qt[p.n])
      tmp.toArray(vals[i], f * 4)
    })
  }
  mixer.stopAllAction()
  return new THREE.AnimationClip(clip.name, clip.duration, pairs.map((p, i) => new THREE.QuaternionKeyframeTrack(`${p.t.name}.quaternion`, times, vals[i])))
}

/**
 * Realistic walking human for MedoShield AI.
 *
 * Professionally sculpted, rigged Mixamo bodies (male "X Bot", female "Michelle") driven by
 * motion-captured walk / idle clips (recorded on the male rig, shared by the female rig through
 * the common Mixamo skeleton). Both get a clinical porcelain material — the 3D version of a
 * medical body map. Assets are pre-optimised (~0.5 MB each, meshopt) and fetched only after the
 * visitor interacts. Ember markers follow the joints the pose model tracks.
 * Scene, materials, retargeting and rendering: Rahul Choudhary.
 */

const URL = { male: '/models/human-male.glb', female: '/models/human-female.glb', gait: '/models/human-gait.glb' }
const HEIGHT = { male: 1.78, female: 1.66 }
const LANDMARK_BONES = ['Head', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot']

const porcelain = () => new THREE.MeshPhysicalMaterial({
  color: '#EBEFF5', roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.5,
  sheen: 0.6, sheenColor: new THREE.Color('#FFFFFF'), sheenRoughness: 0.5,
})
/* Medical outfit, painted per vertex from the bind pose: scrub top (short sleeves), scrub pants, clinical shoes. */
const OUTFIT = { skin: '#EBEFF5', top: '#3860E6', pants: '#182F80', shoes: '#FFFFFF', trim: '#2549CC' }
const clothMat = () => new THREE.MeshPhysicalMaterial({
  vertexColors: true, color: '#FFFFFF', roughness: 0.62, metalness: 0, sheen: 0.7, sheenRoughness: 0.6,
  sheenColor: new THREE.Color('#FFFFFF'), clearcoat: 0.12, clearcoatRoughness: 0.6,
})
function dressInScrubs(root, bone) {
  root.updateMatrixWorld(true)
  const w = (n) => bone(n)?.getWorldPosition(new THREE.Vector3())
  const hips = w('Hips'), neck = w('Neck'), head = w('HeadTop_End') || w('Head')
  const lSh = w('LeftArm'), lEl = w('LeftForeArm'), rSh = w('RightArm'), rEl = w('RightForeArm')
  const lFoot = w('LeftFoot'), rFoot = w('RightFoot')
  if (!hips || !neck || !head || !lSh || !lEl || !lFoot) return false
  const H = head.y - Math.min(lFoot.y, rFoot?.y ?? lFoot.y)
  const waist = hips.y - 0.035 * H // scrub-top hem sits over the upper hip
  const collar = neck.y - 0.035 * H
  const ankle = Math.max(lFoot.y, rFoot?.y ?? lFoot.y) + 0.012 * H
  const sleeve = (sh, el) => sh.distanceTo(el) * 0.42
  const c = Object.fromEntries(Object.entries(OUTFIT).map(([k, v]) => [k, new THREE.Color(v).convertSRGBToLinear()]))
  const v = new THREE.Vector3()
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return
    o.skeleton.update()
    const pos = o.geometry.attributes.position
    const col = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      // real rest-pose position (quantized + skinned meshes need the bone transform)
      v.fromBufferAttribute(pos, i)
      o.applyBoneTransform(i, v)
      v.applyMatrix4(o.matrixWorld)
      let k = 'skin'
      if (v.y <= ankle) k = 'shoes'
      else if (v.y <= waist) k = 'pants'
      else if (v.y <= collar) {
        // arm? (beyond the shoulder line) → short sleeve then bare forearm
        // arms stick out sideways in the rest (T/A) pose: beyond the shoulder joint and near shoulder height
        const armBand = (sh) => Math.abs(v.y - sh.y) < 0.11 * H || v.y > sh.y - 0.02 * H
        const dl = lSh && (v.x - hips.x) * Math.sign(lSh.x - hips.x) > Math.abs(lSh.x - hips.x) + 0.02 * H && armBand(lSh)
        const dr = rSh && (v.x - hips.x) * Math.sign(rSh.x - hips.x) > Math.abs(rSh.x - hips.x) + 0.02 * H && armBand(rSh)
        if (dl) k = v.distanceTo(lSh) < sleeve(lSh, lEl) ? 'top' : 'skin'
        else if (dr) k = v.distanceTo(rSh) < sleeve(rSh, rEl || lEl) ? 'top' : 'skin'
        else k = (v.y > collar - 0.05 * H && Math.abs(v.x - hips.x) < 0.035 * H && v.z > hips.z) ? 'trim' : 'top'
      }
      c[k].toArray(col, i * 3)
    }
    o.geometry = o.geometry.clone()
    o.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
    o.material = clothMat()
  })
  return true
}
const fabric = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.7, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color('#FFFFFF') })
function dressRealMan(root) {
  root.traverse((o) => {
    if (!o.isMesh) return
    const n = `${o.name} ${o.material?.name || ''}`
    if (/Outfit_Top/i.test(n)) o.material = fabric('#FFFFFF') // white lab coat
    else if (/Outfit_Bottom/i.test(n)) o.material = fabric(OUTFIT.pants)
    else if (/Footwear/i.test(n)) o.material = fabric('#2B2622') // clinic shoes
    else if (/Headwear/i.test(n)) o.visible = false // no hat in clinic
  })
}
const hairMat = () => new THREE.MeshPhysicalMaterial({ color: '#5B4A3E', roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color('#9C8676') })
const jointMat = () => new THREE.MeshPhysicalMaterial({ color: '#D0D6E0', roughness: 0.5, clearcoat: 0.3 })

/** Keep only rotation tracks and map Mixamo names ("mixamorig:Hips" / "mixamorigHips") onto this rig. */
function retarget(clip, bones) {
  const tracks = []
  for (const t of clip.tracks) {
    const dot = t.name.lastIndexOf('.')
    const node = t.name.slice(0, dot)
    const prop = t.name.slice(dot + 1)
    if (prop !== 'quaternion') continue
    const bare = node.replace(/^mixamorig:?/, '')
    const target = [node, `mixamorig${bare}`, `mixamorig:${bare}`, bare].find((n) => bones.has(n))
    if (!target) continue
    const copy = t.clone()
    copy.name = `${target}.${prop}`
    tracks.push(copy)
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

/** Real rendered bounds of skinned meshes (bone transforms applied, so cm-scaled rigs measure right). */
function skinnedBounds(root) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3()
  root.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.skeleton.update()
      o.computeBoundingBox()
      box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld))
    } else if (o.isMesh) {
      box.expandByObject(o)
    }
  })
  return box
}

const TRACK = { radius: 0.62, speed: 0.92 } // metres, metres/second (calm clinical walking pace)

function Person({ sex, walking, markers }) {
  const { scene } = useGLTF(URL[sex], false, true)
  const { animations, scene: gaitScene } = useGLTF(URL.gait, false, true) // motion-captured walk / idle (Mixamo)
  const group = useRef()
  const markerRefs = useRef([])

  const { model, bones } = useMemo(() => {
    const m = cloneSkinned(scene)
    m.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.frustumCulled = false
      if (sex === 'female') o.material = porcelain()
    })
    const map = new Map()
    m.traverse((o) => { if (o.isBone) map.set(o.name, o) })
    if (sex === 'female') dressInScrubs(m, (n) => map.get(`mixamorig${n}`) || map.get(`mixamorig:${n}`) || map.get(n))
    else dressRealMan(m)
    // Measure the rendered body from its skeleton (robust to cm/m mixed rigs): head-top → feet.
    const bone = (n) => map.get(`mixamorig${n}`) || map.get(`mixamorig:${n}`) || map.get(n)
    const measure = () => {
      m.updateMatrixWorld(true)
      const w = (b) => (b ? b.getWorldPosition(new THREE.Vector3()) : null)
      const top = w(bone('HeadTop_End')) || w(bone('Head'))
      const feet = ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot'].map((n) => w(bone(n))).filter(Boolean)
      const hips = w(bone('Hips'))
      if (!top || !feet.length) return null
      const bottom = Math.min(...feet.map((v) => v.y))
      return { top: top.y, bottom, hips }
    }
    let r = measure()
    if (r) {
      const s = HEIGHT[sex] / Math.max(r.top - r.bottom + 0.05, 1e-6)
      m.scale.multiplyScalar(s)
      r = measure()
      m.position.y -= r.bottom - 0.035
      m.position.x -= r.hips.x
      m.position.z -= r.hips.z
    } else {
      const box = skinnedBounds(m)
      m.scale.multiplyScalar(HEIGHT[sex] / Math.max(box.max.y - box.min.y, 1e-6))
      m.position.y -= skinnedBounds(m).min.y
    }
    return { model: m, bones: map }
  }, [scene, sex])

  // Male: clips were recorded on this rig → play natively. Female: different rest pose →
  // world-space retargeting (rotation deltas applied over her own rest pose).
  const clips = useMemo(() => {
    const source = gaitScene.clone(true)
    return animations.map((c) => retargetWorld(source, model, c))
  }, [animations, model, gaitScene])
  const { actions } = useAnimations(clips, group)

  useEffect(() => {
    const on = actions[walking ? 'walk' : 'idle']
    const off = actions[walking ? 'idle' : 'walk']
    if (!on) return undefined
    on.reset().setEffectiveWeight(1).fadeIn(0.4).play()
    off?.fadeOut(0.4)
    return () => { on.fadeOut(0.3) }
  }, [walking, actions])

  const landmarkBones = useMemo(
    () => LANDMARK_BONES.map((n) => bones.get(`mixamorig${n}`) || bones.get(`mixamorig:${n}`) || bones.get(n)).filter(Boolean),
    [bones],
  )
  // Face: gentle smile + breathing (morph targets) and natural eye saccades (eye bones), applied after the mixer.
  const face = useMemo(() => {
    const morphs = []
    model.traverse((o) => { if (o.morphTargetDictionary && 'mouthSmile' in o.morphTargetDictionary) morphs.push(o) })
    const eyes = ['LeftEye', 'RightEye'].map((n) => bones.get(`mixamorig${n}`) || bones.get(n)).filter(Boolean)
    return { morphs, eyes, look: new THREE.Euler(), target: new THREE.Euler(), next: 0 }
  }, [model, bones])
  const eyeQ = useMemo(() => new THREE.Quaternion(), [])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (const m of face.morphs) {
      const d = m.morphTargetDictionary
      m.morphTargetInfluences[d.mouthSmile] = 0.32 + Math.sin(t * 0.5) * 0.06
      if ('mouthOpen' in d) m.morphTargetInfluences[d.mouthOpen] = 0.04 + Math.max(0, Math.sin(t * 1.6)) * 0.05
    }
    if (face.eyes.length) {
      if (t > face.next) {
        face.target.set((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.35, 0)
        face.next = t + 0.8 + Math.random() * 2.2
      }
      face.look.x += (face.target.x - face.look.x) * 0.25
      face.look.y += (face.target.y - face.look.y) * 0.25
      eyeQ.setFromEuler(face.look)
      for (const e of face.eyes) e.quaternion.multiply(eyeQ)
    }
  })

  const tmp = useMemo(() => new THREE.Vector3(), [])
  const path = useRef({ a: 0, blend: walking ? 1 : 0 })
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const p = path.current
    const step = Math.min(dt, 0.05)
    p.blend += ((walking ? 1 : 0) - p.blend) * Math.min(1, step * 2.5)
    if (walking) p.a += step * TRACK.speed / TRACK.radius
    const k = p.blend
    g.position.set(Math.sin(p.a) * TRACK.radius * k, 0, Math.cos(p.a) * TRACK.radius * k)
    const heading = Math.atan2(Math.cos(p.a), -Math.sin(p.a))
    g.rotation.y = THREE.MathUtils.lerp(0, heading, k) + (k < 0.999 ? 0 : 0)
    if (!markers) return
    landmarkBones.forEach((b, i) => {
      const mk = markerRefs.current[i]
      if (!mk) return
      b.getWorldPosition(tmp)
      group.current.worldToLocal(tmp)
      mk.position.copy(tmp)
    })
  })

  return (
    <group ref={group}>
      <primitive object={model} />
      {markers && landmarkBones.map((b, i) => (
        <group key={b.name} ref={(el) => { markerRefs.current[i] = el }}>
          <mesh renderOrder={30}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color="#FFFFFF" depthTest={false} transparent opacity={0.95} />
          </mesh>
          <mesh renderOrder={31}>
            <sphereGeometry args={[0.012, 16, 16]} />
            <meshBasicMaterial color="#D9522A" depthTest={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Gait-lab floor: the circular walking track with distance ticks. */
function Walkway() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <mesh>
        <ringGeometry args={[TRACK.radius - 0.012, TRACK.radius + 0.012, 96]} />
        <meshBasicMaterial color="#B8CAFF" transparent opacity={0.75} />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * (TRACK.radius + 0.07), Math.sin(a) * (TRACK.radius + 0.07), 0]} rotation={[0, 0, a]}>
            <planeGeometry args={[0.05, 0.006]} />
            <meshBasicMaterial color="#A9B2C1" transparent opacity={0.7} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * <RealHumanCanvas sex="male|female" walking markers autoRotate className />
 * Transparent background; stops rendering while off-screen.
 */
export default function RealHumanCanvas({ sex = 'female', walking = true, markers = true, autoRotate = true, className }) {
  const host = useRef(null)
  const [visible, setVisible] = useState(true)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    const el = host.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={host} className={className}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 2]}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ position: [0, 1.5, 5.9], fov: 27, near: 0.1, far: 40 }}
      >
        <hemisphereLight args={['#FFFFFF', '#D5DCE6', 0.7]} />
        <directionalLight position={[2.5, 4.5, 3.5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
        <directionalLight position={[-3, 2, -2.5]} intensity={0.7} color="#E6EBF2" />
        <Suspense fallback={null}>
          <Person key={sex} sex={sex} walking={walking && !reduced} markers={markers} />
        </Suspense>
        <Walkway />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={3} blur={2.6} far={1.6} color="#0B1526" />
        <Environment resolution={256}>
          <Lightformer intensity={2.4} position={[0, 4, 3]} scale={[6, 2, 1]} color="#FFFFFF" />
          <Lightformer intensity={1.2} position={[-4, 1.5, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} color="#EEF3FF" />
          <Lightformer intensity={1.0} position={[4, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} color="#F4F6F9" />
          <Lightformer intensity={0.6} position={[0, -1, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} color="#E6EBF2" />
        </Environment>
        <OrbitControls
          target={[0, 0.8, 0]}
          enablePan={false}
          enableZoom={false}
          autoRotate={autoRotate && !walking && !reduced}
          autoRotateSpeed={0.8}
          minPolarAngle={Math.PI * 0.36}
          maxPolarAngle={Math.PI * 0.52}
          rotateSpeed={0.6}
        />
      </Canvas>
    </div>
  )
}
