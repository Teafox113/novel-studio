import { describe, expect, it } from "vitest";
import { classifyQuickText, inferInspirationKind, isWebUrl } from "./quickCapture";

describe("quick capture", () => {
  it("routes complete web URLs to research", () => {
    expect(isWebUrl("https://example.com/maps/old-harbor")).toBe(true);
    expect(classifyQuickText("https://example.com/maps/old-harbor")).toMatchObject({
      type: "web",
      url: "https://example.com/maps/old-harbor",
    });
  });

  it("routes ordinary text to inspiration with a generated title", () => {
    expect(classifyQuickText("主角在鐘樓發現一封沒有署名的信。\n之後再發展。"))
      .toMatchObject({
        type: "inspiration",
        title: "主角在鐘樓發現一封沒有署名的信。",
      });
  });

  it("suggests a useful local inspiration category", () => {
    expect(inferInspirationKind("世界觀：魔法由潮汐驅動")).toBe("world");
    expect(inferInspirationKind("伏筆：懷錶其實來自未來")).toBe("plot");
    expect(inferInspirationKind("「你早就知道了。」她說。" )).toBe("dialogue");
  });
});
