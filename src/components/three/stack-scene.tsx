"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { useInView } from "motion/react";
import { StackModel, type ExplodeSource } from "./stack-model";
import { ParticleFlow } from "./particle-flow";
import { SceneBoundary } from "./scene-boundary";
import { COPYRIGHT_SHORT } from "@/lib/copyright";

export type Vec3 = readonly [number, number, number];

export type StackSceneProps = {
  cameraPosition?: Vec3;
  target?: Vec3;
  explode?: ExplodeSource;
  airflow?: { value: number };
  parallax?: number;
  /** Particle density — drop it on secondary scenes to keep the GPU free. */
  particleCount?: number;
};

/** Aims the camera and pulls back on narrow canvases so nothing crops. */
function CameraRig({ position, target }: { position: Vec3; target: Vec3 }) {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / Math.max(state.size.height, 1));

  useLayoutEffect(() => {
    const focus = new THREE.Vector3(...target);
    const offset = new THREE.Vector3(...position).sub(focus);
    const pullBack = aspect < 1.5 ? 1.5 / Math.max(aspect, 0.5) : 1;
    camera.position.copy(focus).add(offset.multiplyScalar(pullBack));
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
  }, [camera, aspect, position, target]);

  return null;
}

export default function StackScene({
  cameraPosition = [0.9, 1.5, 4.6],
  target = [0, 0.35, 0],
  explode,
  airflow,
  parallax = 0.28,
  particleCount = 2600,
}: StackSceneProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  // Pause the render loop when off screen — saves GPU and battery.
  const inView = useInView(wrapper, { margin: "200px 0px" });
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={wrapper} className="relative h-full w-full">
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 2]}
        camera={{ position: [...cameraPosition], fov: 32, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <CameraRig position={cameraPosition} target={target} />

        {/* Hard key + cool fill + volt rim: product-shot lighting, athletic grade. */}
        <ambientLight intensity={0.22} />
        <directionalLight position={[4, 6, 3]} intensity={2.1} />
        <directionalLight position={[-5, 2, -2]} intensity={0.55} color="#8891a8" />
        <directionalLight position={[-2, 1.5, -5]} intensity={1.15} color="#ccff00" />

        <StackModel explode={explode} pointer={pointer} parallax={parallax} />
        <ParticleFlow count={particleCount} intensity={airflow} />

        <ContactShadows position={[0, -1.15, 0]} opacity={0.55} blur={2.6} scale={11} far={4} resolution={512} />

        {/* HDR comes from a CDN; if it's blocked the lights above still carry the scene. */}
        <SceneBoundary fallback={null}>
          <Suspense fallback={null}>
            <Environment preset="night" environmentIntensity={0.5} />
          </Suspense>
        </SceneBoundary>
      </Canvas>

      <span className="pointer-events-none absolute bottom-3 right-4 select-none font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/40">
        Render {COPYRIGHT_SHORT}
      </span>
    </div>
  );
}
