# 自然的 AI 辅助整理：行为研究、主流产品机制与 Asterism 启示

- 日期：2026-07-28
- 问题：面对数百至数千条数字收藏，怎样让系统承担“挑什么、放哪里、何时维护”的劳动，同时不让 AI 污染用户真正认可的结构？
- 证据边界：仅采用原始研究论文、官方产品文档、官方帮助中心、官方博客与发布说明。产品能力以调研当日公开资料为准。
- 本文是调研记录，不改变现有 contracts 或 ADR。

## 结论摘要

当前“用户先手动选择 / 全选筛选结果，且单次最多 50 条，再让 AI 给出关系建议”的流程，没有兑现“帮助大量未整理 Star 自然形成秩序”的承诺。它把最困难的范围判断和分批计划留给了用户；这恰恰是用户希望 AI 代劳的整理工作。

一手证据呈现出的成熟方向不是“AI 自动给全库做一次永久分类”，而是一个分层系统：

1. **摄取必须近乎无摩擦**：保存后立即进入一个稳定默认位置，不要求当场完成分类。
2. **系统自动派生低风险元数据**：类型、内容、对象、主题候选、向量、相似项和健康状态可以持续生成，因为它们可重算、可隐藏、可纠错。
3. **用检索和动态视图吸收大部分整理需求**：搜索、facet、saved query / Smart Space 会随新内容更新，无需逐条写 canonical 关系。
4. **AI 在用户表达意图后承担范围规划**：用户说“整理未分类的前端工具”“清理重复标签”，系统从全库派生索引中自己找候选，并提出计划；用户不必先挑 50 条。
5. **canonical 写入仍需可预览、可批准、可恢复**：AI 可以提案，不应把不稳定聚类或命名直接当成用户的长期结构。
6. **维护是渐进的，不是一次性大扫除**：新收藏在摄取时获得建议；旧库在使用、搜索、回看或主动请求时出现小而可完成的整理机会。

这意味着 Asterism 最值得探索的不是把 `50` 改成更大的数，而是把“Generation 单次上限”从用户任务模型降为内部执行细节：**用户给意图，系统规划完整范围，以 derived 能力完成候选发现和分段，只有需要 canonical 写入的最终动作才进入审阅与可靠批量执行。**

## 人们实际上怎样整理数字物品

Personal Information Management（PIM）不是单一的“归档”动作，而是从摄取、保存、组织、维护到重新找到和使用的完整生命周期。其核心是在人拥有的信息与未来需求之间建立、使用并维护映射；“保存”从遇到的信息指向预期需求，“查找”则从当前需求反向指向信息。[Jones 等人的 PIM 综述（原始章节预印本）](https://arxiv.org/abs/2107.03291)

这一区分对产品很重要：用户点 Star 时通常只知道“以后可能有用”，未必已经知道它属于哪个长期项目或分类。要求在摄取时完成精确归类，会把尚不存在的未来上下文强加给用户。

文件夹也不只是检索工具。对项目型个人资料的研究发现，文件夹结构会映射项目及子项目，并体现用户不断演化的理解；它同时承载当前使用和未来复用之间的张力。[University of Washington：Don’t Take My Folders Away!](https://digital.lib.washington.edu/researchworks/items/806438cb-e92d-4bbf-b842-8f57bf1a27a7)

因此，AI 可以帮助提出高层结构，但不应声称仅凭内容相似度就发现了用户“真正的”长期分类。Asterism 用真实 518 条 Star 验证并否定全库稳定分簇，与这项研究相符：canonical 结构包含用户目标，不能从内容表征完全推导出来。

另一方面，检索确实能消除大量整理劳动。Microsoft Research 明确提出：个人搜索可以让用户不论在哪里遇到信息、记得什么、甚至忘记某项存在，都仍可找到它；搜索由此减少预先组织的必要。[Cutrell、Dumais、Teevan：Searching to Eliminate Personal Information Management](https://www.microsoft.com/en-us/research/publication/searching-to-eliminate-personal-information-management/)

对 16 名参与者的跨账号、跨设备邮件日记研究也发现：工作邮箱更有结构，因而常通过文件夹取回；个人邮箱文件夹较少，主要依赖内置搜索。也就是说，同一个人会根据内容价值和任务压力，在“精细归档”和“先堆起来、需要时搜索”之间切换。[Microsoft Research：Finding Email in a Multi-Account, Multi-Device World](https://www.microsoft.com/en-us/research/?p=238093)

更直接的 AI / 自动化启示来自 mixed-initiative 研究：在两项现场实验、共 34 名知识工作者中，系统建议**高层组织单元**，使创建组织结构更容易，没有损害用户对这些单元的回忆，并促成了原本不会创建的单元。研究同时指出，手动整理成本对部分用户高到不值得。[Haraty 等：Design and In-Situ Evaluation of a Mixed-Initiative Approach to Information Organization](https://www.microsoft.com/en-us/research/publication/design-situ-evaluation-mixed-initiative-approach-information-organization/)

这支持一种清晰分工：

- 机器擅长持续扫描、派生元数据、找候选、发现重复和建议高层结构；
- 用户擅长表达当前意图、判断结构是否有意义、批准真正长期的命名和边界；
- 产品应让整理成为使用过程的副产品，而不是要求用户先建立完整系统。

## 主流产品逐项观察

### GitHub Lists：保存时可顺手归类，但主要依赖检索与筛选

**摄取时机与结构写入。** 用户点击 Star 即完成保存；List 是可选动作，可在仓库页或 Stars 列表中的 `Starred` 下拉菜单把仓库加入已有或新 List。List 是公开、用户命名的长期结构；加入私有仓库时，只有有读取权限的人能看到该仓库。[GitHub Docs：Saving repositories with stars](https://docs.github.com/en/get-started/exploring-projects-on-github/saving-repositories-with-stars)

**派生元数据、检索与规模。** GitHub 原生提供按最近 Star、最近活跃、Star 数排序，以及语言、仓库类型筛选；Stars 页搜索只匹配仓库或 topic 名称，不匹配更丰富限定符。官方文档未描述 AI 自动分类、AI 派生标签、批量自动写 List 或专门的大库整理流程。[GitHub Docs：Searching, sorting and filtering stars](https://docs.github.com/en/get-started/exploring-projects-on-github/saving-repositories-with-stars#searching-starred-repositories-and-topics)

**审阅、纠错与维护。** List 成员由用户勾选 / 取消，List 名称和描述可编辑、List 可删除，属于直接 canonical 编辑。它降低了“保存时顺手放入已有结构”的摩擦，但面对数百条历史 Star 时仍要求用户逐项找到并处理。

**Asterism 启示。**

- 可借鉴：保存和归类解耦；现有结构在摄取点随手可选；基础排序 / facet 不要求用户维护。
- 不可照搬：公开 List 与 Asterism 的个人私有组织边界不同；GitHub 的逐条下拉无法解决历史大库，也没有替用户决定“从哪里开始”。

### Raindrop.io：摄取时建议 + 全库语义助手 + 审批式变更

**摄取与自动派生。** 保存 URL 后，Raindrop.io 自动提取标题、描述、缩略图、内容类型和全文；内容类型会自动成为 Article、Image、Video、Audio、Document、Book 等 filter，无需预先设置。[Raindrop.io Help：Bookmarks](https://help.raindrop.io/bookmarks/) [Raindrop.io Help：Filters](https://help.raindrop.io/filters)

**AI 是否写结构。** 保存或编辑 bookmark 时，用户可以选择 AI 建议的 collection 和 tag；官方把它描述为“自动建议最匹配的 collections 和 tags，让内容从一开始就有组织”，但用户仍要选择建议，不是静默写入。[Raindrop.io Help：Tags](https://help.raindrop.io/tags) [Raindrop.io Pro](https://raindrop.io/pro)

**全库意图与审阅。** Stella 允许用户直接描述最终结果，甚至执行多步任务，例如“找到所有 Japan 内容并移到 Travel”；较大变更需要先确认。用户也可以要求整理 Unsorted、清理重复 tag、按主题打 tag 或建议整个 library 的更好结构；Stella“提出变更，用户审阅并批准后才应用”。这与“用户先选择若干条，再问 AI”不同：用户表达任务，助手承担找范围和拟计划。[Raindrop.io Help：Stella AI](https://help.raindrop.io/stella)

**检索替代整理。** 普通搜索覆盖标题、描述、URL、notes 和页面全文；用户记不清精确词时，Stella 接受“去年春天保存的晨间习惯文章”这类模糊自然语言查询。新 bookmark 的基本字段可立即搜索，页面全文索引需数分钟。[Raindrop.io Help：Search](https://help.raindrop.io/using-search)

**渐进维护与规模。** 系统提供 Without tags、broken links、duplicates 等 library health filter；tag 重命名 / 删除会作用到所有 bookmarks。官方称全平台接近十亿 bookmarks，Stella 为此建立了可处理数亿文档的 pipeline；Free / Pro 均允许无限 bookmarks、collections 和 tags。发布说明还记录了超过 400,000 bookmarks 账户的备份修复。这里能证明基础设施按大库设计，但不能据此推断单次 AI 变更没有内部上限；Stella 官方只说明 message 没有 hard cap，会受 fair use / cooldown 约束。[Raindrop.io Help：Filters](https://help.raindrop.io/filters) [Raindrop.io Help：Limits](https://help.raindrop.io/limitations) [Raindrop.io 官方博客：Meet Stella](https://blog.raindrop.io/meet-stella-your-ai-powered-second-brain-b34482fb003f/) [Raindrop.io Changelog](https://help.raindrop.io/changelog/web)

**隐私。** Stella 只在用户主动打开对话并提问后激活，不在后台运行；模型是 Raindrop.io 自有基础设施上托管的开源 LLM，数据不发送第三方、不用于训练，通信使用 TLS 1.2+，变更仍需审批。[Raindrop.io Help：Stella privacy FAQ](https://help.raindrop.io/stella)

**Asterism 启示。**

- 可借鉴：让用户描述完整整理意图，由 AI 找范围、拟变更、交给用户审批；摄取时提供已有结构优先的轻建议；把 Untagged、重复 / 近似分类和失效项变成持续维护入口；用语义检索降低不整理的代价。
- 不可照搬：Raindrop.io 自己托管模型和全库索引，Asterism 明确不代付推理费用，Generation 是 BYOK；其数据“留在 Raindrop 服务器”也不同于浏览器内 embedding + 用户自有 Supabase。Asterism 不能以 Stella 的基础设施规模掩盖 Provider token、成本、context window 和错误恢复边界。

### Readwise Reader：所有新条目进稳定默认位置，AI 元数据只前向、可关闭

**摄取。** 手动保存的文章、EPUB 等进入 Library；RSS、newsletter 等自动推送内容先进入独立 Feed，用户认为值得永久保留时再移入 Library。默认 Triage workflow 是 `Inbox → Later → Archive`，每个新保存文档先落 Inbox，再逐项删除、归档或留待阅读。[Readwise Docs：Adding Content to Reader](https://docs.readwise.io/reader/docs/faqs/adding-new-content) [Readwise Docs：Library configuration](https://docs.readwise.io/reader/guides/workflows/library-configuration)

这不是按主题分类，而是按**承诺程度与处理状态**分流，避免用户保存时先回答未来属于什么主题。

**自动派生与结构写入。** Ghostreader 可启用 auto-summary 和 auto-tagging；自动 prompt 只对开启后的新 Library 文档生效，不追溯历史文档，旧文档需用户手动运行。默认不自动处理 Feed，加入用户自己的 OpenAI API key 后才可自动总结 Feed。用户可分别关闭自动总结 / 标签，也可全局关闭 Ghostreader。[Readwise Docs：Ghostreader FAQ](https://docs.readwise.io/reader/docs/faqs/ghostreader)

auto-summary 是明显的 derived 增益；auto-tagging 会把 AI 输出落为用户可见 tag，风险更高，但通过“只前向、按 prompt 开关、全局退出、旧库手动触发”限制了作用范围。官方资料未呈现逐次审批自动 tag 的流程。

**动态视图与渐进维护。** Reader 的 filtered views 可以根据保存日期、阅读时长、highlight 数等参数组合 query 并保存，视图会继续匹配 Library 内容；tag 点击也只是打开过滤视图。用户可改变 Library workflow，若会移动文档会先看到确认弹窗，配置也可随时切换。Daily Digest 还会从 Feed 和 Saved for Later 取一小组内容供轻量 triage 和重新发现旧文档；它每天最多显示一个 badge，也可关闭。[Readwise Docs：Organizing Content](https://docs.readwise.io/reader/docs/organizing-content) [Readwise Docs：Library configuration](https://docs.readwise.io/reader/guides/workflows/library-configuration) [Readwise Docs：Daily Digest](https://docs.readwise.io/reader/docs/faqs/daily-digest)

**规模、隐私与 BYOK。** 官方 changelog 记录过“200,000+ documents”的超大 Library 移动端加载修复，也支持 CSV bulk import，但没有公开 Library hard cap。OpenAI API 只在调用 Ghostreader action 时收到 prompt 指定的文档部分；Readwise 声称已选择不让内容保存或用于训练。默认 Library 自动总结包含在订阅中；Feed 自动总结或更高阶模型需要用户自己的 OpenAI key。[Readwise Changelog](https://docs.readwise.io/changelog) [Readwise Docs：Importing content](https://docs.readwise.io/reader/docs/faqs/importing-content) [Readwise Docs：Ghostreader privacy and API key](https://docs.readwise.io/reader/docs/faqs/ghostreader#can-openai-see-all-of-my-reader-documents-is-my-data-being-used-to-train-their-ai-models)

**Asterism 启示。**

- 可借鉴：总有一个无需选择的摄取默认态；按“待判断 / 稍后 / 已处理”而非主题先行；自动化只前向作用于新增项比回写整个历史库更容易理解；自动能力可逐项关闭；saved query 可以动态维护范围。
- 不可照搬：Asterism 的 Star 已由 GitHub 摄取，不能假装 Star 等于“待处理任务”；Reader 的 Inbox Zero 是可选 reading workflow，不应未经验证变成 Asterism 的强制 Review Queue。Reader 的系统额度也违反 Asterism“不代付 AI”边界。

### myMind：自动标签保持 derived，Smart Spaces 是动态查询而非复制分类

**摄取与派生。** myMind 明确面向“不想维护 folders、labels 和 systems”的用户。图片保存后自动分析对象、颜色和品牌；bookmark 会根据 domain 和 title keyword 建立 invisible tags，即使没有 visible tag 仍可通过搜索找到。[myMind：What is mymind?](https://mymind.com/what) [myMind FAQ：Invisible tags](https://mymind.com/faq)

**是否自动写用户结构。** AI inferred tag 会直接附着在 card 上；官方 API 将 tag provenance 区分为 AI 自动应用和 Manual 用户应用，因此它不是统一审批后的用户判断。产品把这类 tag 主要用于索引和查找，并允许移除；用户也可以反馈不准确的自动 tag。Smart Space 本质是 saved search，凡匹配 query 的既有和新增内容都会动态出现；Regular Space 才是手动成员关系。用户也可以手动把不匹配的 card 加到 Space 或从中移除。[myMind API：Tags](https://access.mymind.com/api/tags) [myMind：Create instant collections with Spaces](https://mymind.com/how-to-get-the-most-out-of-spaces)

这是一种重要边界：系统可以“自动把内容呈现在某个空间”，却不必把每条自动判断写成不可区分的 canonical 分类。

**检索替代整理与维护。** 用户可按 keyword、tag、时间、类别、theme、图片 object 等检索，再把结果保存为会自动更新的 Smart Space。官方也明确说 Spaces 可选，“如果只是搜索更自然，就搜索”。Serendipity 则让用户偶尔浏览旧收藏，顺手删除不再关心的条目，维护嵌入回看过程。[myMind：Spaces](https://mymind.com/how-to-get-the-most-out-of-spaces) [myMind：Spaces on mobile](https://mymind.com/new-spaces-on-mobile) [myMind：Serendipity](https://mymind.com/clear-your-mind)

**规模。** 付费计划宣称 cards 没有数量上限；但官方 FAQ 同时表示未提供从其他服务 mass import 的入口。这说明其低整理负担机制值得研究，却不能把它当作已经验证“数百 GitHub Star 一次性导入与历史整理”的产品证据，也不能从存储无上限推断单次 AI 操作无上限。[myMind Pricing](https://access.mymind.com/pricing) [myMind FAQ：Mass import](https://mymind.com/faq)

**隐私。** 私有内容通过 Amazon Bedrock 调用第三方模型，处理后立即丢弃，不记录 / 保留 / 分享给原模型 Provider；公开 URL 可能由额外第三方 AI 和 proxy 分析。官方称内容不用于训练。[myMind：AI Usage Policy](https://mymind.com/ai-usage-policy)

**Asterism 启示。**

- 可借鉴：自动标签默认属于 derived 索引；Smart Space = 动态 query，而不是 AI 静默创建成员关系；系统自动维护视图，用户只维护少量有真实目标的结构；偶尔回看时顺手清理。
- 不可照搬：myMind 公开资料中的 invisible tags 可解释性有限，Asterism 不应让用户把 derived 和 canonical 混淆；它不支持 mass import，也不能证明历史大库处理；其托管 AI 隐私实现不同于 Asterism 的 BYOK。

### Notion AI：按用户先定义的 schema 自动补字段，搜索降低结构依赖

**摄取与结构前提。** Notion AI 可创建 database、property 和 relation，也可以给 database pages 填 summary、keyword 等上下文。AI Autofill 的工作方式是用户先添加 AI property、选择 summary / key info / custom prompt，然后系统基于每页内容和 property 生成动态文本。[Notion Help：What is Notion AI?](https://www.notion.com/help/notion-ai-faqs) [Notion 官方指南：AI Autofill](https://www.notion.com/help/guides/5-ai-prompts-to-surface-fresh-insights-from-your-databases)

因此它不是对无 schema 内容进行一次性全库分类，而是**用户先定义字段和 prompt，AI 持续填充每一行**。这是“人给结构，机器填重复元数据”的典型分工。

**审阅、纠错。** Notion AI 在页面中生成或编辑内容时，用户可以 accept、discard 或让 AI 重试；官方也提供 thumbs up / down 反馈。Autofill 则是 property 级自动输出，用户可通过 property / prompt 配置改变它。[Notion Help：Notion AI inline review](https://www.notion.com/help/notion-ai-faqs)

**检索替代整理。** Workspace search 可以按 best match、编辑 / 创建时间排序，并按 title、creator、teamspace、所在 page 和 date 筛选；Notion AI 可以跨当前有权访问的 workspace 和 connected apps 搜索并回答。Search 由此承担跨层级 archive 的导航，而不是要求所有信息放在唯一正确路径。[Notion Help：Search in your workspace](https://www.notion.com/help/search)

**规模。** 官方隐私资料描述 Notion 为每个 workspace page 创建 embedding，将 embedding 存入 vector database，检索时先找相关 pages，再由模型 refine / rank；同时宣称 Autofill 可以覆盖整个 database。可确认其任务模型是“全 workspace 检索 / 整库属性”，但公开资料没有给出单次条目上限或超大 database 延迟保证。[Notion Help：AI security and privacy practices](https://www.notion.com/help/notion-ai-security-practices)

**隐私。** 页面 embedding 通过 OpenAI zero-retention embedding API 生成并存入向量库；Notion 把 embedding 按 Customer Data 同等级保护。生成回答时会把 query 和检索到的 pages 发送给 AI subprocessors；workspace owner 可控制 web search，并可要求外部 web 请求先确认。[Notion Help：AI security and privacy practices](https://www.notion.com/help/notion-ai-security-practices)

**Asterism 启示。**

- 可借鉴：让用户只定义少量规则 / 目标，AI 持续填重复字段；检索先找相关范围，再把小而相关的 context 发给 Generation；变更可接受 / 丢弃 / 重试。
- 不可照搬：Notion AI 可由 Agent 创建 / 编辑整个 workspace，权限与产品风险远高于 Asterism 当前 canonical 神圣边界；其系统托管 embedding 和 AI subprocessors 也不符合 Asterism 的浏览器内 embedding、BYOK Generation 与自部署承诺。

### Apple Photos：全库持续派生，人只命名和修正

**摄取与自动派生。** Photos 在设备上做 scene classification、people / pet identification、photo quality 和 audio classification，并用结果生成 Memories、People & Pets、Featured Photos 和分享建议。它还结合编辑 / 分享行为、联系人关系、常去地点和重要日期做个性化。[Apple Legal：Photos & Privacy](https://www.apple.com/legal/privacy/data/en/photos/)

**是否自动写结构。** 系统自动分组 faces、places、scene 和 object，并自动选 face thumbnail；用户命名 person / pet 后，这个名称才同步应用到同一人物的其他照片。换言之，识别和分组先是 derived，用户提供有语义承诺的名称。[Apple Support：Find People and Pets](https://support.apple.com/en-ie/108795)

**审阅、纠错与渐进维护。** 用户可以合并同一人的多个 group，移除被错认的照片，更换 key photo，修正名称，还能减少 / 禁止某人出现在 Memories。Photos 会扫描完整 library，iCloud Photos 开启时用户命名和 favourite 会跨设备更新；用户无需先手选一批照片让系统识别。[Apple Support：Find People and Pets](https://support.apple.com/en-ie/108795)

**检索替代整理。** 用户可以按日期、地点、business、类别、event、已识别的人搜索；照片 info 也会展示系统识别的人、Visual Look Up item、event、相机和地点 metadata。[Apple Support：Search for photos](https://support.apple.com/en-gb/guide/iphone/iph392d77d5f/26/ios/26) [Apple Support：Photo metadata](https://support.apple.com/guide/iphone/see-photo-and-video-information-iph0edb9c18f/26/ios/26)

**规模与隐私。** Apple 不设置“先选 50 张才开始理解”的用户操作模型，而是把识别作为 Library 级持续索引。face recognition、scene 和 object detection 完全在设备上；iCloud Photos 使用时，文件及 metadata 在传输和静态存储时加密。Enhanced Visual Search 的地标匹配会私密访问 server index，并提供关闭开关。[Apple Privacy：Features — Photos](https://www.apple.com/privacy/features/) [Apple Legal：Photos & Privacy](https://www.apple.com/legal/privacy/data/en/photos/)

**Asterism 启示。**

- 可借鉴：全库理解属于后台 / 本地 derived 基础设施，不该表现成用户分批选择；机器自动成组，用户只命名、合并、排除错误和调整推荐偏好；纠错不删除原始条目。
- 不可照搬：照片中的人物身份、时间和地点比代码仓库主题更稳定，不能把 face grouping 的高一致性类推到 Star 的全库主题分类；Apple 控制硬件与端侧模型，Asterism Web 需面对弱设备和首次模型下载。

### Google Photos：无需标签的搜索、可隐藏的自动 stack、局部纠错

**摄取与自动派生。** Backup 开启后，新照片自动同步；用户可以按 people、places 和图片中的 item 搜索，“No tagging is required”。系统还生成 highlight video、collage、animation 和 panorama。[Google Photos Help：Back up photos & videos](https://support.google.com/photos/answer/6193313)

**是否自动写结构。** Face Groups 会先检测 face、生成数值 face model、预测相似性，再把可能属于同一人的照片组成 group；用户添加的 name / nickname 才是可搜索私有 label。Photo stacks 则可自动把相似照片折叠，并建议 top pick，但不改变可用 storage；用户随时打开 stack 查看全部条目。[Google Photos Help：Face Groups](https://support.google.com/photos/answer/6128838?co=GENIE.Platform%3DDesktop&hl=en) [Google Photos Help：Photo stacks](https://support.google.com/photos/answer/14169846?hl=en-uk)

**审阅、纠错与渐进维护。** 用户可以确认系统建议的两个 face group 是 Same、Different 或 Not sure；可以合并 group、改 / 删 label、从错误 group 移除照片，单张照片也可添加 / 移除 / 改 person label。移出 group 不会删除 library 原图。地点可来自 camera、手动输入或系统估计，估计位置可修改 / 删除。[Google Photos Help：Manage Face Groups](https://support.google.com/photos/answer/6128838?co=GENIE.Platform%3DDesktop&hl=en) [Google Photos Help：Locations](https://support.google.com/photos/answer/6153599?co=GENIE.Platform%3DDesktop&hl=en)

**作用范围与规模。** 自动机制以整个 Library 为范围，不要求用户先为识别或搜索选择一批照片。对 stack 执行分享、加入 album 等动作时，产品会明确询问“只处理选中项”还是“包含 stacks”，把 derived group 的范围扩展变成一次显式选择。[Google Photos Help：Photo stack actions](https://support.google.com/photos/answer/14169846?hl=en-uk)

**隐私。** Face Groups 可整体关闭；关闭会删除 face groups、face models 和用户 face labels。face group 和 label 默认仅本人可见，不随分享的照片共享；Google 也明确提示 face model 在部分法域可能属于 biometric data。[Google Photos Help：Face Groups privacy](https://support.google.com/photos/answer/6128838?co=GENIE.Platform%3DDesktop&hl=en) [Google Photos Help：Face Groups retention](https://support.google.com/photos/answer/11965565?hl=en)

**Asterism 启示。**

- 可借鉴：默认全库 derived 索引；搜索无需标签；derived grouping 可以只改变视图、不改变原数据；从 group 扩展到写操作时再次确认准确范围；纠错是局部移除 / 合并，不是重新跑全库。
- 不可照搬：face model 有稳定实体假设，仓库主题具有重叠、多维和随用户目标变化的性质；Asterism 不能自动把相似组当成唯一 collection。

## 横向比较

| 产品 | 摄取默认态 | 自动派生 | 自动写入用户长期结构 | 审阅 / 纠错 | 动态维护 / 检索 | 大库任务模型 | 隐私特点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub Lists | Star 列表 | 活跃度、语言、类型等筛选数据 | 否；List 全手动 | 勾选 / 取消成员 | 搜索、排序、facet | 逐条 List 操作 | List 公开；私有 repo 仍按权限显示 |
| Raindrop.io | 保存即可，可进 Unsorted | 标题、摘要、缩略图、类型、全文索引 | AI 建议需选择；Stella 变更需审批 | review / approve | 语义搜索、health filters | 用户描述全库任务，助手找范围 | Stella 自托管模型；主动对话才触发，不训练 |
| Readwise Reader | Inbox / Later；自动来源进 Feed | clean content、summary、auto-tags | auto-tag 可前向写入且可关闭 | 旧项手动运行；workflow 移动先确认 | filtered views、搜索 | 稳定 Inbox 渐进 triage | 可全局关闭 AI；部分动作 BYOK OpenAI |
| myMind | 保存到 Everything | invisible tags、对象 / 颜色 / 品牌、类型 | Smart Space 不写成员，只动态匹配 | 可反馈自动 tag；Space 可手动增删 | 搜索、saved search、Serendipity | 不支持 mass import | 私有内容经 Bedrock 隔离处理，不训练 |
| Notion AI | 进入用户定义的 page / database | embedding、summary、keyword、custom property | Autofill 写 AI property；Agent 可显式编辑 | accept / discard / retry、反馈 | workspace / connected-app search | 整个 workspace 检索、整 database Autofill | 托管 embedding / subprocessors，权限过滤 |
| Apple Photos | Library | 人物、地点、场景、对象、质量、回忆 | 自动分组属 derived；用户命名后才有语义承诺 | 合并、排错、更名、换 key photo | 全库搜索、自动 collections | 端侧持续扫描全库 | 识别端侧；iCloud 加密 |
| Google Photos | Library | face model、地点估计、相似 stack、自动 creations | 自动 group / stack 主要改变呈现 | Same / Different / Not sure、移出、改地点 | 无需标签的 people / place / item 搜索 | Library 级索引；写动作再确认 group 范围 | Face Groups 可关闭并删除模型，labels 私有 |

## 对 Asterism 当前边界的判断

### 应坚持的部分

1. **canonical / derived 分离是正确基础。** Apple Photos、Google Photos、myMind 都把机器推断优先用于自动集合、索引或动态视图；用户命名和长期项目结构仍是另一层。Asterism 不应因为追求“自动整理”而复活全库互斥分簇或静默写 tags / collections。
2. **浏览器内 embedding 值得继续作为全库 derived 平台能力。** 它已能承担搜索、相似候选、局部范围发现和动态 query，不受 Generation 的 50 条输入限制，也不发送原始 repo 内容给第三方。
3. **BYOK、发送字段披露、笔记 opt-in 和可靠批量账本应保留。** 这些约束解决的是 Provider 成本 / 隐私与 canonical 写入恢复，不能为了“自然”而隐去。
4. **审阅应针对“有意义的决定”，不是针对每一条机器计算。** 新分类名称、移除已有关系、大范围成员写入值得确认；embedding、内容类型、动态查询命中不需要逐条批准。

### 当前不成立的部分

1. **选择优先把范围发现倒置了。** 用户面对 500 条未整理 Star 时，通常没有足够线索先选出“适合一起整理的 50 条”。如果已能精准筛选和选择，AI 提供的边际价值反而下降。
2. **“全选筛选结果”只是高手捷径，不是自然入口。** 它要求用户先理解 facet、构造 query、预测结果纯度，再处理超过 50 条的问题；这不是普通用户表达整理意图的方式。
3. **单次 50 条是合理的 Provider 防护，但不是合理的产品任务上限。** 把它直接暴露为“请缩小范围”，等于把 context window、token 成本和重试规划转嫁给用户。Raindrop.io 和 Notion 的用户任务都是全库意图 / 整库字段，内部检索和分段对用户不可见。
4. **一个完整建议表不是渐进维护。** 它天然造成高审阅量和草稿替换冲突。成熟产品更多把自动化放在新增条目、动态视图、健康检查和用户当前任务附近。
5. **检索优先不能单独回答“我想让库变得更有秩序”。** 混合搜索与 Related Stars 解决 finding / exploration，但不会帮用户形成少量自己认可的长期项目结构，也不会清理历史 tag / collection 债务。

## 可探索的产品模型

下面是研究推导出的方向，不是已接受需求。

### 1. 从“选中后生成”改为“意图后规划”

用户直接表达目标，例如：

- “把还没分类的前端开发工具整理一下。”
- “找出我重复或意思相近的标签，给我一个合并计划。”
- “我最近收藏的 AI coding 工具里，哪些适合放进已有集合？”
- “把已归档或两年没更新的项目列出来，但先不要改任何东西。”

系统先用本地 / 自有 Supabase 中的 derived metadata、embedding、现有 canonical 关系、时间和状态构造**完整候选范围**，向用户展示“我理解的目标、候选数量、为什么选中这些”。用户确认的是意图和范围摘要，不是先手工挑条目。

### 2. 把 50 条变成内部 Generation 分段

如果一个任务有 237 个候选：

- 范围发现不调用 BYOK Generation，先由确定性 query / embedding 完成；
- 系统按语义邻域、已有分类候选和 token 预算形成内部小段，每段不超过 Provider 安全边界；
- 每段 Generation 输出使用稳定 repository ID 和稳定分类 ID；
- 跨段只做确定性归并、名称规范化、近似分类检测，不让模型凭名称猜已有分类；
- 用户看到的是一个 task 的整体进度、费用 / token 预估、已完成分段和失败分段，不负责决定“下一批哪 50 条”；
- 只有用户批准的最终变更进入既有 bulk operation ledger。

这需要重新审视当前“不做隐式分块”的 contract，不能在现有契约下悄悄实现；但研究表明，不改变这一点就无法真正消除大库摩擦。

### 3. 让 derived 动态视图先提供秩序感

借鉴 Smart Space / filtered view：

- 系统可以把“未分类”“最近 Star”“已归档”“长期无更新”“相似于当前项目”“匹配某个用户 query”呈现为动态范围；
- 这些范围随同步增量更新，不复制 tag / collection 关系，不宣称是稳定主题；
- 用户可将一个有明确目标的 query 保存为视图，是否进一步固化为 collection 是单独显式动作；
- 自动派生的主题词必须明确标为 AI / derived，不与用户 tag 混在同一语义层。

当前 product contract 把“保存视图”放在 Phase 2 之后按需评估；如果选择此方向，需要用户明确决策并更新 contract / ADR。

### 4. 把维护分布在自然时机

- **新增时**：新 Star 同步后，根据现有 canonical 结构给出最多一两个高置信 suggestion；忽略不阻塞浏览。
- **使用时**：用户搜索、打开 Quick Look、编辑 tag / collection 时，可出现与当前意图直接相关的轻建议。
- **主动整理时**：用户用自然语言发起完整任务，AI 找范围和规划。
- **偶尔回看时**：提供由用户主动进入的随机 / 最近 / 未整理回看，不强制 Inbox Zero，不把 Star 自动定义成待办。
- **健康维护时**：重复 / 近似 tags、失效 repo、已归档和长期未更新应是确定性检查，优先不用 Generation。

### 5. 审阅从“逐条读完整表”变成“风险分层”

- 已有分类的高置信添加：按目标分类聚合预览，可展开抽查和排除。
- 新分类：必须单独批准名称，并展示代表性成员、边界例外和与已有分类的近似项。
- 移除已有 canonical 关系：单独分组，默认不批准或要求更明确确认。
- 不确定项：宁可留在 derived / 未处理状态，不强行补足建议数量。
- 每个聚合决策都可展开到 repository 级；确认前始终显示准确最终关系数。

这里延续现有 review schema 的稳定 ID、添加 / 移除显式区分和新分类单独批准，只改变审阅的信息层级与 AI 的范围责任。

## 建议的下一步验证

在改 UI 或 contracts 前，用真实 Star 库做三个低成本原型比较：

1. **Selection-first 基线**：现有选择 / filter → ≤50 → 完整建议表。
2. **Intent-first planner**：自然语言意图 → derived 范围解释 → AI 分段计划 → 风险分层审阅。
3. **Dynamic views first**：无需 Generation 的自动范围 / saved query → 使用中轻 promotion。

每个原型至少覆盖：

- 新用户首次导入 500+ 条、多数无组织的 Star；
- 已有 tags / collections、希望持续维护的用户；
- 只想快速重新找到某项、不想整理的用户；
- 未配置 BYOK、Provider 失败、额度不足、笔记关闭和弱设备降级。

验证指标不应是“AI 建议了多少条”，而应是：

- 用户从打开产品到获得第一份可用秩序需要做多少决定；
- 用户是否能用自己的语言说明这次整理目标；
- 是否无需手工规划 50 条批次；
- 用户能否解释并纠正范围和分类；
- 审阅后真正接受的关系 / 分类比例；
- 中断、失败和刷新后是否能继续；
- 不整理时，是否仍能可靠找到 Star。

## 最终判断

难而正确的事情不是追求“一键自动分类全库”，也不是继续让用户手工选 50 条。更好的产品边界是：

> **AI 自动理解和维护 derived 世界，用户拥有 canonical 世界；用户表达目标，AI 承担范围发现、分段和重复劳动，用户只审阅真正有长期语义或破坏风险的决定。**

这既能保留 Asterism 已验证的 canonical 神圣性、浏览器内 embedding、BYOK 隐私和可靠批量执行，也直面当前流程留下的核心缺口：让系统而不是用户决定“从这几百条里，先整理哪一些”。
