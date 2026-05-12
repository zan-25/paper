import type { GeneratedPaper, PaperQuestion } from "@/lib/ai-api";

interface PaperPreviewProps {
  formData?: {
    examType?: string;
    department?: string;
    subjectName?: string;
    subjectCode?: string;
    semester?: string;
    maxMarks?: number;
    batch?: string;
    duration?: string;
    dateOfIat?: string;
    teachingDept?: string;
    instructions?: string;
    coDescriptions?: Record<string, string>;
  };
  questions: PaperQuestion[];
  generatedPaper?: GeneratedPaper | null;
}

const DEFAULT_COS = {
  CO1: "",
  CO2: "",
  CO3: "",
  CO4: "",
  CO5: "",
};

function buildQuestionBlueprint(maxMarks: number) {
  if (maxMarks <= 50) {
    const patterns = [
      ...Array.from({ length: 4 }, () => [5, 5] as const),
      ...Array.from({ length: 6 }, () => [4, 6] as const),
    ];
    return patterns.flatMap(([partA, partB], index) => [
      {
        questionNumber: index + 1,
        subpart: "a",
        label: `${index + 1}a`,
        marks: partA,
        moduleNumber: Math.floor(index / 2) + 1,
      },
      {
        questionNumber: index + 1,
        subpart: "b",
        label: `${index + 1}b`,
        marks: partB,
        moduleNumber: Math.floor(index / 2) + 1,
      },
    ]);
  }

  const hundredMarkModules = [
    [1, [[1, "a", 6], [1, "b", 6], [1, "c", 8], [2, "a", 6], [2, "b", 6], [2, "c", 8]]],
    [2, [[3, "a", 5], [3, "b", 8], [3, "c", 7], [4, "a", 5], [4, "b", 8], [4, "c", 7]]],
    [3, [[5, "a", 5], [5, "b", 8], [5, "c", 7], [6, "a", 5], [6, "b", 8], [6, "c", 7]]],
    [4, [[7, "a", 10], [7, "b", 10], [8, "a", 10], [8, "b", 10]]],
    [5, [[9, "a", 10], [9, "b", 10], [10, "a", 10], [10, "b", 10]]],
  ] as const;

  return hundredMarkModules.flatMap(([moduleNumber, rows]) =>
    rows.map(([questionNumber, subpart, marks]) => ({
      questionNumber,
      subpart,
      label: `${questionNumber}${subpart}`,
      marks,
      moduleNumber,
    })),
  );
}

function buildPercentageMap(
  values: Record<string, any> | undefined,
  keys: string[],
) {
  return Object.fromEntries(keys.map((key) => [key, values?.[key] ?? 0]));
}

export function PaperPreview({
  formData,
  questions,
  generatedPaper,
}: PaperPreviewProps) {
  const paperConfig = generatedPaper?.ai_config ?? {};
  const coverage = generatedPaper?.coverage_stats ?? {};
  const coPercentages = buildPercentageMap(coverage?.percentages?.co, [
    "CO1",
    "CO2",
    "CO3",
    "CO4",
    "CO5",
  ]);
  const modulePercentages = buildPercentageMap(coverage?.percentages?.modules, [
    "1",
    "2",
    "3",
    "4",
    "5",
  ]);

  const defaults = {
    examType: generatedPaper?.exam_type || "First Internal Assessment Test (IAT-1)",
    department:
      formData?.department ||
      generatedPaper?.department_name ||
      "Artificial Intelligence and Machine Learning",
    subjectName:
      formData?.subjectName || generatedPaper?.subject_name || "Machine Learning",
    subjectCode:
      formData?.subjectCode || generatedPaper?.subject_code || "21AI51",
    semester: formData?.semester || generatedPaper?.semester || "5",
    maxMarks: formData?.maxMarks || generatedPaper?.max_marks || 50,
    batch: formData?.batch || generatedPaper?.batch || "2022-26",
    duration:
      formData?.duration ||
      `${generatedPaper?.duration_minutes || 90} Minutes`,
    dateOfIat:
      formData?.dateOfIat ||
      generatedPaper?.exam_date ||
      "To be announced",
    teachingDept:
      formData?.teachingDept ||
      generatedPaper?.teaching_department ||
      "AIML",
    instructions:
      formData?.instructions ||
      paperConfig.instructions ||
      "Instruction: Answer the following questions",
    coDescriptions: {
      ...DEFAULT_COS,
      ...(paperConfig.co_descriptions ?? {}),
      ...(formData?.coDescriptions ?? {}),
    },
    templateNote:
      paperConfig.template_note ||
      ((formData?.maxMarks || generatedPaper?.max_marks || 50) >= 100
        ? "Answer any FIVE full questions, choosing at least ONE question from each MODULE"
        : ""),
  };

  const blueprint = buildQuestionBlueprint(defaults.maxMarks || 50);
  const previewQuestions = questions.slice(0, blueprint.length);

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white px-4 py-4 font-sans text-[11px] text-black">
      <div className="flex items-center gap-3 border-b border-black pb-3">
        <img
          src="/dsatm-seal.svg"
          alt="DSATM seal"
          className="h-14 w-14 object-contain"
        />
        <div className="flex-1 border-r border-black pr-3">
          <p className="text-[12px] font-bold">
            Dayananda Sagar Academy of Technology &amp; Management
          </p>
          <p className="text-[10px]">(Autonomous Institute under VTU)</p>
        </div>
        <div className="min-w-[220px] text-[10px] leading-tight">
          <p>
            Affiliated to <span className="text-red-600">VTU</span>
          </p>
          <p>
            Approved by <span className="text-red-600">AICTE</span>
          </p>
          <p>
            Accredited by <span className="text-red-600">NAAC</span> with{" "}
            <span className="text-red-600">A+</span> Grade
          </p>
          <p>
            6 Programs Accredited by <span className="text-red-600">NBA</span>
          </p>
          <p>(CSE, ISE, ECE, EEE, MECH, CV)</p>
        </div>
        <img
          src="/iqac-seal.svg"
          alt="IQAC seal"
          className="h-14 w-14 object-contain"
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[11px]">
        <span>USN:</span>
        <div className="flex gap-[2px]">
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={index} className="h-6 w-6 border border-black" />
          ))}
        </div>
      </div>

      <h2 className="mt-3 text-center text-[15px] font-bold">
        Department of {defaults.department}
      </h2>

      <div className="mt-3 border border-black text-center text-[13px] font-bold">
        <div className="px-3 py-1.5">{defaults.examType}</div>
      </div>

      <table className="mt-3 w-full border-collapse text-[11px]">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 font-bold">Subject:</td>
            <td className="border border-black px-2 py-1">{defaults.subjectName}</td>
            <td className="border border-black px-2 py-1 font-bold">Subject Code:</td>
            <td className="border border-black px-2 py-1">{defaults.subjectCode}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold">Semester:</td>
            <td className="border border-black px-2 py-1">{defaults.semester}</td>
            <td className="border border-black px-2 py-1 font-bold">Max. Marks:</td>
            <td className="border border-black px-2 py-1">{defaults.maxMarks}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold">Batch:</td>
            <td className="border border-black px-2 py-1">{defaults.batch}</td>
            <td className="border border-black px-2 py-1 font-bold">Duration:</td>
            <td className="border border-black px-2 py-1">{defaults.duration}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold">Date of IAT:</td>
            <td className="border border-black px-2 py-1">{defaults.dateOfIat}</td>
            <td className="border border-black px-2 py-1 font-bold">
              Teaching Department:
            </td>
            <td className="border border-black px-2 py-1">{defaults.teachingDept}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-bold">RBT Levels:</td>
            <td className="border border-black px-2 py-1" colSpan={3}>
              L1-Remember, L2-Understand, L3-Apply, L4-Analyze, L5-Evaluate, L6-Create
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-4 text-center text-[11px] italic">{defaults.instructions}</p>
      {defaults.templateNote ? (
        <div className="mt-3 text-[11px]">
          <p className="font-bold">Note:</p>
          <p>{defaults.templateNote}</p>
        </div>
      ) : null}

      <table className="mt-2 w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 text-center">Q No</th>
            <th className="border border-black px-2 py-1 text-center">Questions</th>
            <th className="border border-black px-2 py-1 text-center">Marks</th>
            <th className="border border-black px-2 py-1 text-center">COs</th>
            <th className="border border-black px-2 py-1 text-center">RBTL</th>
          </tr>
        </thead>
        <tbody>
          {blueprint.flatMap((slot, index) => {
            const question = previewQuestions[index];
            const rows = [];
            const previousSlot = index > 0 ? blueprint[index - 1] : null;

            if (
              defaults.maxMarks > 50 &&
              (!previousSlot || previousSlot.moduleNumber !== slot.moduleNumber)
            ) {
              rows.push(
                <tr key={`module-${slot.moduleNumber}`}>
                  <td
                    colSpan={5}
                    className="border border-black px-2 py-1 text-center font-bold"
                  >
                    Module - {slot.moduleNumber}
                  </td>
                </tr>,
              );
            }

            if (
              defaults.maxMarks > 50 &&
              slot.subpart === "a" &&
              slot.questionNumber % 2 === 0
            ) {
              rows.push(
                <tr key={`or-${slot.questionNumber}`}>
                  <td
                    colSpan={5}
                    className="border border-black px-2 py-1 text-center font-medium"
                  >
                    OR
                  </td>
                </tr>,
              );
            }

            rows.push(
              <tr key={`question-${slot.label}`}>
                <td className="border border-black px-2 py-1 align-top text-center">
                  {slot.label}
                </td>
                <td className="border border-black px-2 py-1 align-top">
                  {question?.text || ""}
                </td>
                <td className="border border-black px-2 py-1 align-top text-center">
                  {question?.custom_marks ?? slot.marks}
                </td>
                <td className="border border-black px-2 py-1 align-top text-center">
                  {question?.course_outcome || ""}
                </td>
                <td className="border border-black px-2 py-1 align-top text-center">
                  {question?.bloom_level || ""}
                </td>
              </tr>,
            );

            return rows;
          })}
        </tbody>
      </table>

      <div className="mt-8">
        <p className="mb-1 text-center text-[11px] font-bold">
          Course Outcomes (COs):&nbsp; At the end of the Course, the Student will be able to:
        </p>
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {["CO1", "CO2", "CO3", "CO4", "CO5"].map((co) => (
              <tr key={co}>
                <td className="w-12 border border-black px-2 py-1 font-bold">{co}</td>
                <td className="border border-black px-2 py-1">
                  {defaults.coDescriptions[co] || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 space-y-5">
        <div>
          <p className="mb-1 text-[11px] font-bold">Percentage of CO Coverage</p>
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 text-center font-bold">
                  Course Outcomes
                </td>
                {["CO1", "CO2", "CO3", "CO4", "CO5"].map((co) => (
                  <td key={co} className="border border-black px-2 py-1 text-center font-bold">
                    {co}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 text-center font-bold">
                  Percentage
                </td>
                {["CO1", "CO2", "CO3", "CO4", "CO5"].map((co) => (
                  <td key={co} className="border border-black px-2 py-1 text-center">
                    {coPercentages[co]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-bold">Percentage of Syllabus coverage</p>
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 text-center font-bold">
                  Modules Covered
                </td>
                {["1", "2", "3", "4", "5"].map((module) => (
                  <td
                    key={module}
                    className="border border-black px-2 py-1 text-center font-bold"
                  >
                    {module}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 text-center font-bold">
                  Percentage
                </td>
                {["1", "2", "3", "4", "5"].map((module) => (
                  <td key={module} className="border border-black px-2 py-1 text-center">
                    {modulePercentages[module]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
