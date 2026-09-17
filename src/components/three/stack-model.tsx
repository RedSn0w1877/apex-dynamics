"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { buildShoeParts, heelTop, lugLayout, xAt } from "./shoe-geometry";

export type ExplodeSource = { value: number };
export type PointerRef = RefObject<{ x: number; y: number }>;

/**
 * Prototype 04 as a real shoe that pulls apart into its layers on scroll.
 *
 * Five groups, bottom to top: outsole, carrier foam, carbon plate, main foam, upper.
 * They sit together at rest and spread to the `open` offsets as `explode` goes 0 → 1.
 * The order never crosses, so no layer passes through another mid-animation.
 */
const LAYERS = [
  { id: "outsole", open: -0.72 },
  { id: "carrier", open: -0.32 },
  { id: "plate", open: 0.16 },
  { id: "foam", open: 0.58 },
  { id: "upper", open: 1.12 },
] as const;

type StackModelProps = {
  explode?: ExplodeSource;
  pointer: PointerRef;
  parallax?: number;
};

export function StackModel({ explode, pointer, parallax = 0.28 }: StackModelProps) {
  const root = useRef<THREE.Group>(null);
  const stack = useRef<THREE.Group>(null);
  const lugs = useRef<THREE.InstancedMesh>(null);

  const parts = useMemo(() => buildShoeParts(), []);
  const lugSpots = useMemo(() => lugLayout(), []);
  const lugGeometry = useMemo(() => new THREE.BoxGeometry(0.075, 0.03, 0.05), []);

  const mats = useMemo(
    () => ({
      rubber: new THREE.MeshStandardMaterial({ color: "#141417", roughness: 0.92 }),
      carrier: new THREE.MeshStandardMaterial({ color: "#2b2b31", roughness: 0.7 }),
      foam: new THREE.MeshStandardMaterial({ color: "#e4e4dc", roughness: 0.62 }),
      plate: new THREE.MeshStandardMaterial({
        color: "#ccff00",
        roughness: 0.25,
        metalness: 0.5,
        emissive: "#ccff00",
        emissiveIntensity: 0.4,
      }),
      mesh: new THREE.MeshStandardMaterial({ color: "#34343c", roughness: 0.88, side: THREE.DoubleSide }),
      collar: new THREE.MeshStandardMaterial({ color: "#1c1c21", roughness: 0.8 }),
      opening: new THREE.MeshStandardMaterial({ color: "#070708", roughness: 1, side: THREE.DoubleSide }),
      lace: new THREE.MeshStandardMaterial({ color: "#f5f5f5", roughness: 0.55 }),
      volt: new THREE.MeshStandardMaterial({ color: "#ccff00", emissive: "#ccff00", emissiveIntensity: 0.55 }),
    }),
    [],
  );

  // Place the tread lugs once; instancing draws all of them in one call.
  useEffect(() => {
    const mesh = lugs.current;
    if (!mesh) return;
    const m = new THREE.Object3D();
    lugSpots.forEach((spot, i) => {
      m.position.set(spot.x, spot.y, spot.z);
      m.rotation.set(0, spot.rot, 0);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [lugSpots]);

  useEffect(
    () => () => {
      Object.values(parts).flat().forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      lugGeometry.dispose();
    },
    [parts, mats, lugGeometry],
  );

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;

    const dt = Math.min(delta, 1 / 30);
    const e = explode ? THREE.MathUtils.clamp(explode.value, 0, 1) : 0;
    const t = state.clock.elapsedTime;

    LAYERS.forEach((layer, i) => {
      const child = stack.current?.children[i];
      if (!child) return;
      child.position.y = THREE.MathUtils.damp(child.position.y, layer.open * e, 9, dt);
      // Layers fan apart slightly as they separate, so the stack opens like a diagram.
      child.rotation.z = THREE.MathUtils.damp(child.rotation.z, e * (i - 2) * 0.04, 6, dt);
    });

    // Sink and shrink slightly as it opens, so the top layer never leaves the frame.
    const body = stack.current;
    if (body) {
      body.position.y = THREE.MathUtils.damp(body.position.y, -0.18 - e * 0.32, 9, dt);
      body.scale.setScalar(THREE.MathUtils.damp(body.scale.x, 1 - e * 0.14, 9, dt));
    }

    const { x, y } = pointer.current;
    // Slow turntable + cursor parallax, easing toward a side-on read as it explodes.
    const idleSpin = Math.sin(t * 0.18) * 0.32;
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, -0.35 + idleSpin + x * parallax - e * 0.3, 3.5, dt);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, 0.12 - y * parallax * 0.4 + e * 0.12, 3.5, dt);
  });

  return (
    <group ref={root}>
      {/* Drop the shoe so its visual centre sits where the old stack did. */}
      <group ref={stack} position={[-0.12, -0.18, 0]}>
        <group>
          <mesh geometry={parts.outsole} material={mats.rubber} />
          <instancedMesh ref={lugs} args={[lugGeometry, mats.rubber, lugSpots.length]} />
        </group>
        <group>
          <mesh geometry={parts.carrier} material={mats.carrier} />
        </group>
        <group>
          <mesh geometry={parts.plate} material={mats.plate} />
          {/* The fork: a channel splitting the forefoot of the plate. */}
          <mesh geometry={parts.slot} material={mats.carrier} />
        </group>
        <group>
          <mesh geometry={parts.foam} material={mats.foam} />
        </group>
        <group>
          <mesh geometry={parts.upper} material={mats.mesh} />
          <mesh geometry={parts.opening} material={mats.opening} />
          <mesh geometry={parts.collar} material={mats.collar} />
          {parts.laces.map((g, i) => (
            <mesh key={i} geometry={g} material={mats.lace} />
          ))}
          {parts.stripes.map((g, i) => (
            <mesh key={i} geometry={g} material={mats.volt} />
          ))}
          {/* Heel pull tab. */}
          <mesh material={mats.volt} position={[xAt(0.015), heelTop() + 0.03, 0]}>
            <boxGeometry args={[0.035, 0.14, 0.08]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
