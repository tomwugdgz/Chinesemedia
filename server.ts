import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize GoogleGenAI client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI 智能选点推荐接口
app.post("/api/ai/smart-select", async (req, res) => {
  try {
    const { 
      requirement, 
      points, 
      targetAudience, 
      budget, 
      city, 
      targetCount, 
      mediaTypePreference,
      preferredLevel
    } = req.body;

    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: "点位数据池不能为空" });
    }

    const ai = getGenAI();

    // 简化点位摘要信息发送给大模型，避免超长 token
    const pointsSummary = points.map(p => ({
      id: p.id,
      pointNo: p.pointNo,
      project: p.project,
      city: p.city,
      area: p.area,
      block: p.block,
      level: p.level,
      mediaType: p.mediaType,
      price: p.price,
      households: p.households,
      occupancy: p.occupancy,
      builtYear: p.builtYear,
      category: p.category,
      audience: p.audience,
      totalMedia: p.totalMedia,
      status: p.status,
      restriction: p.restriction
    }));

    const prompt = `
你是一位资深户外社区传媒媒介策划与点位精选专家。请根据客户的具体投放诉求与画像，从候选点位库中智能精选最匹配的推荐点位，并给出专业的推荐理由、受众契合度分析、性价比与预估触达效果。

【客户投放诉求】:
- 核心诉求/行业/品牌: ${requirement || "无特殊限定，追求核心受众高覆盖"}
- 目标受众画像: ${targetAudience || "家庭消费中坚、社区高频出入人群"}
- 投放城市: ${city || "全部"}
- 目标推荐数量: ${targetCount || 5} 个
- 预算/周: ¥${budget || "不限"}
- 媒体类型偏好: ${mediaTypePreference || "全部"}
- 偏好楼盘等级: ${preferredLevel || "全部"}

【候选点位库列表 (JSON)】:
${JSON.stringify(pointsSummary.slice(0, 80), null, 2)}

请分析以上点位，输出 JSON 格式推荐结果。
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "你是一个精通中国社区电梯媒体、单元门智能屏投放的AI媒介大师，擅长基于社区楼盘特征、受众属性、入住率、地理商圈进行高转化选点匹配。输出严格符合 JSON Schema 规范。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategySummary: {
              type: Type.STRING,
              description: "AI 选点策略总评与媒介组合战术解析（100-200字）"
            },
            totalEstimatedAudience: {
              type: Type.STRING,
              description: "预估周度总曝光受众量（例如：'约 45,000 人次/周'）"
            },
            recommendedBudgetTotal: {
              type: Type.NUMBER,
              description: "推荐方案总刊例金额（元/周）"
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pointId: { type: Type.STRING, description: "匹配的点位ID" },
                  matchScore: { type: Type.NUMBER, description: "匹配得分（0-100）" },
                  recommendReasons: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "3条精炼的核心推荐亮点" 
                  },
                  targetMatchRate: { type: Type.STRING, description: "目标受众重合度描述（如 95%）" },
                  audienceHighlight: { type: Type.STRING, description: "受众特征与场景匹配亮点" }
                },
                required: ["pointId", "matchScore", "recommendReasons", "targetMatchRate"]
              }
            }
          },
          required: ["strategySummary", "recommendations"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText);

    res.json({
      success: true,
      data: resultJson
    });
  } catch (error: any) {
    console.error("AI Smart Select Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || "AI 智能选点计算失败" 
    });
  }
});

// AI 智能投放方案生成与多维度评估接口
app.post("/api/ai/smart-plan-match", async (req, res) => {
  try {
    const { 
      brand, 
      industry, 
      objective, 
      city, 
      startDate, 
      durationWeeks, 
      budget, 
      selectedPointIds, 
      pointsPool 
    } = req.body;

    const ai = getGenAI();

    const selectedPoints = (pointsPool || []).filter((p: any) => 
      (selectedPointIds || []).includes(p.id)
    );

    const prompt = `
请为广告主【${brand || "某知名品牌"}】(所属行业: ${industry || "大众消费品"}) 量身定制专业的《户外社区媒介投放执行与排期方案》。
投放目标: ${objective || "提升品牌区域知名度并引流转化"}
目标城市: ${city || "广州"}
预计投放起止周期: 起始于 ${startDate || "近期周六"}，投放周期约 ${durationWeeks || 2} 周
方案预算: ¥${budget || 50000}
已选/意向点位数: ${selectedPoints.length} 个
已选点位楼盘明细: ${selectedPoints.map((p: any) => `${p.project}(${p.level}级-${p.mediaType})`).join(", ") || "由系统在候选池中优选"}

请根据社区媒体传播规律（电梯封闭空间高频停留、单元门智能屏必经出入口视线抢占），生成包含投放节奏、受众场景渗透、画面物料文案创意建议、排他风险提示与ROI预估的深度策划案。
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "你是一个顶级4A广告公司户外媒介总监，熟悉各行业社区电梯框、单元门屏的投放公式与曝光策略。输出结构化 JSON 方案。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planTitle: { type: Type.STRING, description: "方案主题标题" },
            executiveSummary: { type: Type.STRING, description: "方案执行摘要" },
            audienceStrategy: { type: Type.STRING, description: "人群与场景渗透策略" },
            mediaMixRatio: { 
              type: Type.STRING, 
              description: "建议电梯框架与单元门屏配比（例如：70% 电梯框架 + 30% 单元门智能屏）" 
            },
            creativeTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3条针对社区画面的创意视觉与文案优化建议（例如：主视觉大字3秒吸睛、社区专属优惠码）"
            },
            flightScheduleTips: { type: Type.STRING, description: "上画与轮播排期建议（建议周六上画、跨周留存）" },
            riskExclusionWarnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "竞品排他或物业进场注意事项"
            },
            expectedReachMetric: { type: Type.STRING, description: "预估千人成本 CPM / 预估触达家庭总数" }
          },
          required: ["planTitle", "executiveSummary", "audienceStrategy", "creativeTips", "expectedReachMetric"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText);

    res.json({
      success: true,
      data: resultJson
    });
  } catch (error: any) {
    console.error("AI Plan Match Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || "AI 方案匹配生成失败" 
    });
  }
});

// AI 媒介顾问对话式问答助理接口
app.post("/api/ai/chat-assistant", async (req, res) => {
  try {
    const { messages, contextInfo } = req.body;
    const ai = getGenAI();

    const formattedHistory = (messages || []).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const lastMessage = formattedHistory.pop();
    if (!lastMessage) {
      return res.status(400).json({ error: "消息不能为空" });
    }

    const systemPrompt = `
你是由「社区点位管理系统」内置的 AI 媒介专家与点位智选顾问。
当前系统运行上下文:
- 当前点位总数: ${contextInfo?.totalPoints || 0}
- 已发布点位数: ${contextInfo?.publishedPoints || 0}
- 已锁点位数: ${contextInfo?.lockedPoints || 0}
- 执行计划数: ${contextInfo?.totalPlans || 0}
- 客户总数: ${contextInfo?.totalCustomers || 0}

你可以解答用户关于：
1. 如何为特定行业（如新能源车、K12教育、本地餐饮、医美、家装、金融理财）搭配最佳社区梯媒方案；
2. 选点避坑指南（如同小区竞品排他、高入住率次新盘挑选、大框与小框刊例性价比）；
3. 锁单保护规则（A类客户7天、B/C类3天）与上画巡检验收标准；
4. 撰写《上画通知书》特殊交付要求与监测标准。

回答风格：专业严谨、数据导向、条理清晰、排版美观。
`;

    const chat = ai.chats.create({
      model: "gemini-3.7-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({
      message: lastMessage.parts[0].text
    });

    res.json({
      success: true,
      reply: response.text || "未能生成回答，请重试。"
    });
  } catch (error: any) {
    console.error("AI Chat Assistant Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "AI 顾问服务暂时无法连接"
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Mediaplaner server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
