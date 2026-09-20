"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type ParticleFlowProps = {
  count?: number;
  speed?: number;
  intensity?: { value: number };
  color?: string;
  accent?: string;
  width?: number;
  height?: number;
  depth?: number;
  size?: number;
};

const VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aTint;
  uniform float uTravel;
  uniform float uTime;
  uniform float uWidth;
  uniform float uDepth;
  uniform float uSize;
  uniform float uScale;
  varying vec3 vTint;
  void main() {
    vec3 p = position;
    float pace = (1.8 + aSeed * 2.4) * (0.6 + (p.z + uDepth * 0.5) / uDepth);
    p.x = mod(p.x + uWidth * 0.5 + uTravel * pace, uWidth) - uWidth * 0.5;
    p.y += sin(uTime * 0.7 + p.x * 0.42 + aSeed * 6.283) * 0.48;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize * uScale / max(0.1, -mv.z), 1.0, 12.0);
    vTint = aTint;
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;
  varying vec3 vTint;
  void main() {
    float alpha = 1.0 - smoothstep(0.1, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(vTint, alpha * 0.45);
    #include <colorspace_fragment>
  }
`;

function createRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function ParticleFlow({
  count = 1400,
  speed = 1,
  intensity,
  color = "#f5f5f5",
  accent = "#ccff00",
  width = 16,
  height = 7,
  depth = 7,
  size = 0.022,
}: ParticleFlowProps) {
  const live = useRef<THREE.ShaderMaterial | null>(null);

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const base = new THREE.Color(color);
    const hot = new THREE.Color(accent);
    const random = createRandom(1877);
    for (let i = 0; i < count; i++) {
      positions.set([(random() - 0.5) * width, (random() - 0.5) * height, (random() - 0.5) * depth], i * 3);
      seeds[i] = random();
      const tint = random() < 0.1 ? hot : base;
      colors.set([tint.r, tint.g, tint.b], i * 3);
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aTint", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTravel: { value: 0 }, uTime: { value: 0 }, uWidth: { value: width },
        uDepth: { value: depth }, uSize: { value: size }, uScale: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [count, width, height, depth, color, accent, size]);

  useEffect(() => {
    live.current = material;
    return () => {
      live.current = null;
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Positions stay on the GPU; only two clocks and the pixel scale change each frame.
  useFrame((state, delta) => {
    const current = live.current;
    if (!current) return;
    const uniforms = current.uniforms;
    const dt = Math.min(delta, 1 / 20);
    uniforms.uTime.value += dt;
    uniforms.uTravel.value += dt * (intensity?.value ?? 1) * speed;
    uniforms.uScale.value = state.size.height * state.viewport.dpr * 0.5;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
