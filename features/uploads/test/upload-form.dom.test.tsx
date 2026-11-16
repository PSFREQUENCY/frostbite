import { describe, expect, it, vi } from "vitest";

import { UploadForm } from "../src/ui/components/upload-form.tsx";
import {
  chooseFile,
  chooseOption,
  imageFile,
  mount,
  textOf,
} from "./support/dom.tsx";

describe("upload form", () => {
  it("offers every purpose and an image-only file input", async () => {
    const container = await mount(
      <UploadForm disabled={false} onFile={() => undefined} />,
    );
    const options = [...container.querySelectorAll("option")].map(
      (option) => option.textContent,
    );
    expect(options).toEqual([
      "Collection artwork",
      "Collection banner",
      "Collection item artwork",
      "Creator avatar",
    ]);
    expect(container.querySelector("input")?.accept).toBe(
      "image/jpeg,image/png,image/webp,image/svg+xml",
    );
  });

  it("offers a vector picture only where the use takes it", async () => {
    const container = await mount(
      <UploadForm disabled={false} onFile={() => undefined} />,
    );
    await chooseOption(container, "creator-avatar");
    expect(container.querySelector("input")?.accept).toBe(
      "image/jpeg,image/png,image/webp",
    );
    await chooseOption(container, "collection-banner");
    expect(container.querySelector("input")?.accept).toContain("image/svg+xml");
  });

  it("states the size limit of the chosen purpose", async () => {
    const container = await mount(
      <UploadForm disabled={false} onFile={() => undefined} />,
    );
    expect(textOf(container)).toContain("up to 25 MB");
    await chooseOption(container, "creator-avatar");
    expect(textOf(container)).toContain("up to 5 MB");
  });

  it("passes the file together with the purpose chosen at that moment", async () => {
    const onFile = vi.fn();
    const container = await mount(
      <UploadForm disabled={false} onFile={onFile} />,
    );
    await chooseOption(container, "collection-banner");
    const file = imageFile();
    await chooseFile(container, file);
    expect(onFile).toHaveBeenCalledExactlyOnceWith(file, "collection-banner");
  });

  it("disables both controls while an upload is running", async () => {
    const container = await mount(
      <UploadForm disabled onFile={() => undefined} />,
    );
    expect(container.querySelector("select")?.disabled).toBe(true);
    expect(container.querySelector("input")?.disabled).toBe(true);
  });
});
