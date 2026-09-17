"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type ParticleFlowProps = {
  count?: number;
  /** Baseline stream speed; multiplied by `intensity` each frame. */
  speed?: number;
  /** Mutable 0–1 source, so scroll/UI can drive the airflow without re-rendering. */
  intensity?: { value: number };
  color?: string;
  accent?: string;
  width?: number;
  height?: number;
  depth?: number;
  size?: number;
};

/**
 * A GPU point field that streams along +X like air through a tunnel.
 *
 * Particles don't travel in straight lines — each one carries a seed that feeds a
 * sine displacement, so the field reads as curling airflow rather than a conveyor
 * belt. Nearer particles run faster, which gives the stream parallax depth.
 *
 * The random seeding happens in an effect rather than during render: `Math.random()`
 * during render is impure, and a re-render would otherwise reshuffle the whole field.
 */
export function ParticleFlow({
  count = 2600,
  speed = 1,
  intensity,
  color = "#f5f5f5",
  accent = "#ccff00",
  width = 16,
  height = 7,
  depth = 7,
  size = 0.028,
}: ParticleFlowProps) {
  const points = useRef<THREE.Points>(null);
  const seeds = useRef<Float32Array>(new Float32Array(0));
  const seeded = useRef(false);

  useEffect(() => {
    const geometry = points.current?.geometry;
    if (!geometry) return;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const nextSeeds = new Float32Array(count);
    const base = new THREE.Color(color);
    const hot = new THREE.Color(accent);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * width;
      positions[i3 + 1] = (Math.random() - 0.5) * height;
      positions[i3 + 2] = (Math.random() - 0.5) * depth;
      nextSeeds[i] = Math.random();

      // A minority of particles burn volt — enough to read as accent, not confetti.
      const tint = Math.random() < 0.18 ? hot : base;
      colors[i3] = tint.r;
      colors[i3 + 1] = tint.g;
      colors[i3 + 2] = tint.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    seeds.current = nextSeeds;
    seeded.current = true;

    return () => {
      seeded.current = false;
      geometry.dispose();
    };
  }, [count, width, height, depth, color, accent]);

  useFrame((state, delta) => {
    const mesh = points.current;
    if (!mesh || !seeded.current) return;

    const attr = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (!attr) return;

    const array = attr.array as Float32Array;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const push = (intensity?.value ?? 1) * speed;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = seeds.current[i];

      // Depth-scaled speed: closer particles move faster, so the field has parallax.
      const depthFactor = 0.6 + (array[i3 + 2] + depth / 2) / depth;
      array[i3] += dt * push * (1.8 + seed * 2.4) * depthFactor;

      // Curl: vertical drift keyed to position + time so streamlines bend.
      array[i3 + 1] += Math.sin(t * 0.7 + array[i3] * 0.42 + seed * 6.283) * dt * 0.34;

      // Recycle off the downstream edge back to the intake.
      if (array[i3] > width / 2) {
        array[i3] = -width / 2;
        array[i3 + 1] = (Math.random() - 0.5) * height;
        array[i3 + 2] = (Math.random() - 0.5) * depth;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry />
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
