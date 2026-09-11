import type {
  RichTextDocument,
  StoryDocument,
  StoryProject,
} from "../domain/models";
import { migrateStoryProject } from "../domain/migrations";

const now = "2026-07-28T14:30:00+08:00";

function document(
  id: string,
  paragraphs: Array<string | { heading: string }>,
): StoryDocument {
  const content: RichTextDocument = {
    type: "doc",
    content: paragraphs.map((paragraph) =>
      typeof paragraph === "string"
        ? {
            type: "paragraph",
            content: paragraph ? [{ type: "text", text: paragraph }] : undefined,
          }
        : {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: paragraph.heading }],
          },
    ),
  };

  return {
    id,
    content,
    plainText: paragraphs
      .map((paragraph) =>
        typeof paragraph === "string" ? paragraph : paragraph.heading,
      )
      .join("\n"),
    revision: 1,
    updatedAt: now,
  };
}

const documents = {
  "doc-1": document("doc-1", [
    { heading: "雨夜的來客" },
    "午夜過後，霧港的鐘樓敲了十三下。",
    "林晝站在舊書店的窗後，看見一個沒有影子的人穿過雨幕。那人沒有撐傘，懷裡卻抱著一本完全乾燥的藍皮書。",
    "他知道，父親留下的警告終於成真了。",
    "門把緩緩轉動。書店裡所有燈火，同時熄滅。",
  ]),
  "doc-2": document("doc-2", [
    { heading: "不能被閱讀的書" },
    "藍皮書沒有書名，也沒有作者。每當林晝試圖翻開它，紙頁就會傳出潮汐般的低鳴。",
    "來客只留下一句話：別讓鐘塔看見黎明。",
  ]),
  "doc-3": document("doc-3", [
    { heading: "鐘塔下的階梯" },
    "清晨四點，林晝帶著書來到封鎖十五年的舊鐘塔。",
    "石階向下延伸，遠比鐘塔本身應有的深度更長。",
  ]),
  "doc-4": document("doc-4", [
    { heading: "潮汐議會" },
    "這是一段尚未完成的場景。議會將第一次揭露霧港與海之間的契約。",
  ]),
};

const legacySampleProject = {
  schemaVersion: 1,
  id: "project-mist-harbor",
  title: "霧港十三夜",
  subtitle: "長篇奇幻小說",
  author: "Fox",
  updatedAt: now,
  nodes: [
    {
      id: "manuscript",
      parentId: null,
      kind: "folder",
      title: "正文",
      synopsis: "完整小說手稿",
      status: "草稿",
      sortOrder: 0,
      wordCount: 0,
      updatedAt: now,
    },
    {
      id: "volume-1",
      parentId: "manuscript",
      kind: "folder",
      title: "第一部｜霧中來客",
      synopsis: "林晝取得藍皮書，發現霧港被抹去的第十三夜。",
      status: "草稿",
      sortOrder: 0,
      wordCount: 0,
      targetWords: 50000,
      updatedAt: now,
    },
    {
      id: "scene-1",
      parentId: "volume-1",
      kind: "scene",
      title: "01　雨夜的來客",
      synopsis: "神祕來客將藍皮書交給林晝，鐘樓異常敲響。",
      status: "修訂",
      pov: "林晝",
      location: "渡鴉舊書店",
      sortOrder: 0,
      wordCount: 83,
      targetWords: 1800,
      documentId: "doc-1",
      updatedAt: now,
    },
    {
      id: "scene-2",
      parentId: "volume-1",
      kind: "scene",
      title: "02　不能被閱讀的書",
      synopsis: "林晝試圖破解藍皮書，發現父親留下的第一道暗語。",
      status: "草稿",
      pov: "林晝",
      location: "渡鴉舊書店",
      sortOrder: 1,
      wordCount: 49,
      targetWords: 1800,
      documentId: "doc-2",
      updatedAt: now,
    },
    {
      id: "scene-3",
      parentId: "volume-1",
      kind: "scene",
      title: "03　鐘塔下的階梯",
      synopsis: "兩人進入鐘塔地下，第一次看見潮汐刻印。",
      status: "構思",
      pov: "林晝",
      location: "舊鐘塔",
      sortOrder: 2,
      wordCount: 39,
      targetWords: 2000,
      documentId: "doc-3",
      updatedAt: now,
    },
    {
      id: "volume-2",
      parentId: "manuscript",
      kind: "folder",
      title: "第二部｜沉沒的契約",
      synopsis: "潮汐議會召開，霧港必須決定要犧牲誰的記憶。",
      status: "構思",
      sortOrder: 1,
      wordCount: 0,
      targetWords: 60000,
      updatedAt: now,
    },
    {
      id: "scene-4",
      parentId: "volume-2",
      kind: "scene",
      title: "04　潮汐議會",
      synopsis: "五大家族在退潮後的議事廳碰面。",
      status: "構思",
      pov: "沈月",
      location: "沉潮廳",
      sortOrder: 0,
      wordCount: 33,
      targetWords: 2200,
      documentId: "doc-4",
      updatedAt: now,
    },
  ],
  documents,
  entities: [
    {
      id: "entity-lin",
      type: "character",
      name: "林晝",
      summary: "渡鴉舊書店的年輕店主，能聽見被刪去的文字。",
      color: "#e59f71",
    },
    {
      id: "entity-shen",
      type: "character",
      name: "沈月",
      summary: "潮汐議會最年輕的記錄官。",
      color: "#90a7d5",
    },
    {
      id: "entity-harbor",
      type: "location",
      name: "霧港",
      summary: "每年會從歷史中消失一夜的海港城市。",
      color: "#72b4a4",
    },
  ],
};

const migratedSample = migrateStoryProject(legacySampleProject);

export const sampleProject: StoryProject = {
  ...migratedSample,
  tags: [
    {
      id: "tag-main-mystery",
      name: "主線謎團",
      category: "story",
      color: "#7b87b8",
      createdAt: now,
    },
    {
      id: "tag-foreshadowing",
      name: "伏筆",
      category: "story",
      color: "#d58b63",
      createdAt: now,
    },
  ],
  tagLinks: [
    {
      id: "tag-link-scene-1-mystery",
      tagId: "tag-main-mystery",
      targetType: "scene",
      targetId: "scene-1",
      createdAt: now,
    },
    {
      id: "tag-link-scene-1-foreshadowing",
      tagId: "tag-foreshadowing",
      targetType: "scene",
      targetId: "scene-1",
      createdAt: now,
    },
  ],
  entityRelations: [
    {
      id: "relation-lin-harbor",
      fromEntityId: "entity-lin",
      toEntityId: "entity-harbor",
      type: "resident-of",
      label: "居住於",
      notes: "林晝在霧港經營渡鴉舊書店。",
      sourceNodeIds: ["scene-1"],
      createdAt: now,
      updatedAt: now,
    },
  ],
  timelineEvents: [
    {
      id: "event-father-warning",
      title: "父親留下警告",
      summary: "林晝的父親察覺第十三夜，留下不能讓鐘塔看見黎明的警告。",
      kind: "backstory",
      status: "confirmed",
      storyTimeLabel: "故事開始前十五年",
      storyOrder: 0,
      narrativeOrder: 2.5,
      importance: 5,
      linkedNodeIds: ["scene-2"],
      linkedEntityIds: ["entity-lin"],
      color: "#9175aa",
      createdAt: now,
      updatedAt: now,
    },
    ...migratedSample.timelineEvents,
  ],
  inspirations: [
    {
      id: "idea-tide-name",
      title: "潮汐會偷走人的名字",
      content: "退潮時被海水碰到影子的人，隔天會失去一個名字。可以成為第二部的代價機制。",
      kind: "plot",
      status: "developing",
      linkedNodeIds: [],
      linkedEntityIds: ["entity-harbor"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "idea-dialogue-father",
      title: "父親留下的最後一句話",
      content: "「如果你還記得我，就表示那一夜還沒有結束。」",
      kind: "dialogue",
      status: "inbox",
      linkedNodeIds: [],
      linkedEntityIds: ["entity-lin"],
      createdAt: now,
      updatedAt: now,
    },
  ],
  researchItems: [
    {
      id: "research-harbor-fog",
      title: "港口霧氣與航海視線筆記",
      kind: "note",
      status: "reviewed",
      summary: "整理霧氣對燈塔、船鐘與短距離航行的影響，供霧港場景描寫使用。",
      notes: "能見度降低時，聲音會比輪廓更早抵達；可用鐘聲作為場景方向感。",
      sourceUrl: "",
      citation: {
        author: "",
        publisher: "",
        publishedAt: "",
        accessedAt: "2026-07-28",
      },
      originalFileName: "",
      mediaType: "text/plain",
      byteSize: 0,
      dataUrl: "",
      linkedNodeIds: ["scene-1"],
      linkedEntityIds: ["entity-harbor"],
      linkedInspirationIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "research-tide-calendar",
      title: "潮汐與月相參考來源",
      kind: "web",
      status: "inbox",
      summary: "待整理潮汐週期，建立霧港曆法與議會日期規則。",
      notes: "確認大潮與朔望月的關係後，再決定第二部事件日期。",
      sourceUrl: "https://example.com/tide-reference",
      citation: {
        author: "",
        publisher: "",
        publishedAt: "",
        accessedAt: "2026-07-28",
      },
      originalFileName: "",
      mediaType: "text/html",
      byteSize: 0,
      dataUrl: "",
      linkedNodeIds: ["scene-4"],
      linkedEntityIds: ["entity-harbor"],
      linkedInspirationIds: [],
      createdAt: now,
      updatedAt: now,
    },
  ],
};
