import { Mesh, MeshStandardMaterial, type Material } from "three";
import { describe, expect, it } from "vitest";

import { effects, track } from "../src/audio.ts";
import { loadModels, modelOf, rigged } from "../src/view/models/load.ts";
import { modelNames } from "../src/view/models/packed.ts";
import {
  aurora,
  frostIce,
  holo,
  pulse,
  spirit,
  standard,
  water,
} from "../src/view/models/shaders.ts";

const fakeShader = () => ({
  fragmentShader: "#include <common>\n#include <emissivemap_fragment>",
  uniforms: {},
  vertexShader:
    "#include <common>\n#include <begin_vertex>\n#include <project_vertex>",
});

describe("Frost Run's heroes", () => {
  it("load from their packed text, stand at the height asked, and play their clips by what the hero does", async () => {
    const models = await loadModels();
    expect([...models.keys()].sort()).toEqual([...modelNames].sort());
    expect(modelOf.slice(0, 4)).toEqual([
      "hero-volt",
      "hero-nib",
      "hero-lumen",
      "hero-hrimm",
    ]);
    const volt = models.get("hero-volt");
    if (volt === undefined) throw new Error("no Volt");
    expect(volt.clips.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["Idle", "Run", "Win"]),
    );
    const one = rigged(volt, 1.7);
    one.update(0, 0.1, false);
    one.update(14, 0.1, false);
    one.update(0, 0.1, true);
    expect(one.root.children).toHaveLength(1);
    let meshes = 0;
    one.root.traverse((part) => {
      if (part instanceof Mesh) meshes += 1;
    });
    expect(meshes).toBeGreaterThan(0);
  }, 30_000);

  it("finish their materials in the shader: holo, spirit, pulse, ice, water and aurora", () => {
    for (const finish of [holo, spirit, frostIce, water, aurora]) {
      const material = new MeshStandardMaterial();
      finish(material);
      const shader = fakeShader();
      material.onBeforeCompile(shader as never, undefined as never);
      expect(shader.vertexShader).toContain("vWorldPos");
      expect(material.customProgramCacheKey()).not.toBe("");
    }
    const lamp = new MeshStandardMaterial();
    pulse(lamp, "test-lamp", 2, 0.3);
    lamp.onBeforeCompile(fakeShader() as never, undefined as never);
    expect(standard(lamp)).toBe(lamp);
    expect(standard({ type: "MeshBasicMaterial" } as Material)).toBeNull();
  });
});

describe("the sound", () => {
  it("is sixteen steps a voice, and has an effect for each moment the page plays", () => {
    for (const voice of track.voices) expect(voice.notes).toHaveLength(16);
    expect(Object.keys(effects).sort()).toEqual([
      "catch",
      "milestone",
      "miss",
      "start",
    ]);
  });
});
