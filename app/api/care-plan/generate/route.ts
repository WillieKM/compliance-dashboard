import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildTemplatePlan, formatTemplateAsText, type AssessmentData } from "@/lib/careplan/assessmentTemplate";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { assessmentData }: { assessmentData: AssessmentData } = await request.json();

  // Step 1 — build structured template from assessment answers
  const templateItems = buildTemplatePlan(assessmentData);
  const templateText = formatTemplateAsText(
    assessmentData.residentName,
    assessmentData.assessmentDate,
    templateItems
  );

  // Step 2 — Claude AI expands and polishes the template
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are an experienced Adult Family Home (AFH) care coordinator with 15+ years writing person-centered care plans compliant with Washington State DSHS regulations (WAC 388-76).

Your care plans:
- Use professional, warm, person-centered language
- Are specific and measurable (SMART goals)
- Include evidence-based interventions
- Meet WAC 388-76 documentation requirements
- Respect resident dignity, autonomy, and individual preferences
- Are practical for direct care staff to follow

Format your response as a complete, ready-to-use care plan document. Use clear headings and bullet points.`,

    messages: [
      {
        role: "user",
        content: `Please expand and polish the following care plan template into a complete, professional AFH Individual Care Plan. Keep all the core content but:
1. Make goals more specific and measurable with timeframes
2. Add 1-2 additional evidence-based interventions per need area where appropriate
3. Use warm, person-centered language (use the resident's name)
4. Add an introduction paragraph summarizing the resident's strengths and support needs
5. Add a signature block at the end (resident, legal representative, care coordinator, date)
6. Ensure WAC 388-76 compliance language is present

ASSESSMENT SUMMARY:
- Diagnoses: ${assessmentData.diagnoses || "See assessment"}
- Medications: ${assessmentData.medications || "See MAR"}
- Allergies: ${assessmentData.allergies || "None known"}
- Fall Risk: ${assessmentData.fallRisk || "To be assessed"}
- Cognitive Status: ${assessmentData.memoryStatus || "See assessment"}
- Behavioral Concerns: ${assessmentData.behavioralConcerns || "None noted"}

TEMPLATE TO EXPAND:
${templateText}`,
      },
    ],
  });

  const carePlanText =
    message.content[0].type === "text" ? message.content[0].text : templateText;

  return NextResponse.json({ carePlanText, templateItems });
}
