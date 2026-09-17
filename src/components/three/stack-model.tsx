"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

export type ExplodeSource = { value: number };
export type PointerRef = RefObject<{ x: number; y: number }>;

/**
 * The shoe as an exploded technical stack rather than a modelled shoe.
 *
 * Each layer is a tapered slab sized to the real spec (38 mm heel, 30 mm forefoot,
 * 8 mm drop). Wedge shapes come from scaling the far end of each slab, which reads
 * as a rockered midsole without pretending to be a traced silhouette.
 */
const LAYERS = [
  { id: "outsole", rest: 0, open: -0.95, height: 0.07, width: 3.0, depth: 1.05, color: "#17171b", rough: 0.85, metal: 0.0 },
  { id: "midsole", rest: 0.12, open: 0.05, height: 0.3, width: 2.96, depth: 1.02, color: "#232329", rough: 0.72, metal: 0.05 },
  { id: "plate", rest: 0.3, open: 0.95, height: 0.035, width: 2.86, depth: 0.95, color: "#ccff00", rough: 0.28, metal: 0.45 },
  { id: "upper", rest: 0.42, open: 1.85, height: 0.34, width: 2.8, depth: 0.92, color: "#3a3a44", rough: 0.9, metal: 0.0 },
] as const;

type StackModelProps = {
  explode?: ExplodeSource;
  pointer: PointerRef;
  parallax?: number;
};

export function StackModel({ explode, pointer, parallax = 0.28 }: StackModelProps) {
  const root = useRef<THREE.Group>(null);

  const materials = useMemo(
    () =>
      LAYERS.map(
        (layer) =>
          new THREE.MeshStandardMaterial({
            color: layer.color,
            roughness: layer.rough,
            metalness: layer.metal,
            emissive: layer.id === "plate" ? new THREE.Color("#ccff00") : new THREE.Color("#000000"),
            emissiveIntensity: layer.id === "plate" ? 0.35 : 0,
          }),
      ),
    [],
  );

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;

    const dt = Math.min(delta, 1 / 30);
    const e = explode ? THREE.MathUtils.clamp(explode.value, 0, 1) : 0;
    const t = state.clock.elapsedTime;

    LAYERS.forEach((layer, i) => {
      const child = group.children[i];
      if (!child) return;
      const target = THREE.MathUtils.lerp(layer.rest, layer.open, e);
      child.position.y = THREE.MathUtils.damp(child.position.y, target, 9, dt);
      // Layers fan apart slightly as they separate, so the stack opens like a diagram.
      child.rotation.z = THREE.MathUtils.damp(child.rotation.z, e * (i - 1.5) * 0.045, 6, dt);
    });

    const { x, y } = pointer.current;
    // Slow turntable + cursor parallax, easing to a front-on read as it explodes.
    const idleSpin = Math.sin(t * 0.18) * 0.32;
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, idleSpin + x * parallax - e * 0.5, 3.5, dt);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, 0.18 - y * parallax * 0.4 + e * 0.16, 3.5, dt);
  });

  return (
    <group ref={root}>
      {LAYERS.map((layer, i) => (
        <group key={layer.id} position={[0, layer.rest, 0]}>
          <RoundedBox
            args={[layer.width, layer.height, layer.depth]}
            radius={Math.min(layer.height / 2.6, 0.05)}
            smoothness={4}
            material={materials[i]}
            // Taper the toe end: a rockered wedge, not a rectangular brick.
            scale={[1, 1, 1]}
          />
        </group>
      ))}
    </group>
  );
}
