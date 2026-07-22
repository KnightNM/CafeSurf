import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AmbientSceneProps {
  compact?: boolean;
}

export default function AmbientScene({ compact = false }: AmbientSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, compact ? 1.8 : 2.4, compact ? 5.5 : 6.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(7.5, compact ? 2.6 : 3.6, 48, 18);
    const material = new THREE.MeshBasicMaterial({
      color: 0x171717,
      transparent: true,
      opacity: compact ? 0.1 : 0.12,
      wireframe: true,
    });
    const wave = new THREE.Mesh(geometry, material);
    wave.rotation.x = -Math.PI / 2.7;
    wave.rotation.z = -0.08;
    wave.position.y = compact ? -0.3 : -0.38;
    scene.add(wave);

    const points = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 90 }, (_, index) => {
          const angle = index * 0.42;
          const radius = 0.4 + index * 0.018;
          return new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(index * 0.11) * 0.18,
            Math.sin(angle) * radius
          );
        })
      ),
      new THREE.PointsMaterial({
        color: 0x111111,
        size: compact ? 0.014 : 0.018,
        transparent: true,
        opacity: 0.26,
      })
    );
    points.position.set(compact ? 1.55 : 2.25, compact ? 0.25 : 0.55, compact ? -0.2 : -0.45);
    scene.add(points);

    const position = geometry.attributes.position as THREE.BufferAttribute;
    const base = position.array.slice() as Float32Array;
    let frameId = 0;

    function resize() {
      if (!mount) return;
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function animate(time: number) {
      const t = time * 0.001;
      for (let index = 0; index < position.count; index += 1) {
        const x = base[index * 3];
        const y = base[index * 3 + 1];
        position.setZ(index, Math.sin(x * 1.6 + t) * 0.11 + Math.cos(y * 2.1 + t * 0.7) * 0.05);
      }
      position.needsUpdate = true;
      wave.rotation.z = -0.08 + Math.sin(t * 0.18) * 0.025;
      points.rotation.y = t * 0.08;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      if (points.geometry) points.geometry.dispose();
      const pointsMaterial = points.material;
      if (Array.isArray(pointsMaterial)) {
        pointsMaterial.forEach((item) => item.dispose());
      } else {
        pointsMaterial.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [compact]);

  return <div className="ambientScene" aria-hidden="true" ref={mountRef} />;
}
