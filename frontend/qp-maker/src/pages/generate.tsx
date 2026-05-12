import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ChevronRight, Download, Edit, FileText, RotateCw, Search, Settings2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PaperPreview } from "@/components/paper-preview";
import { useSubjectsApiV1SubjectsGet } from "@workspace/api-client-react";
import { useAIGeneratePaper, useDownloadPaper, useQuestionBankSummary, useQuestions } from "@/lib/ai-api";

const step1Schema = z.object({
  department: z.string().min(1, "Required"),
  subjectId: z.string().min(1, "Required"),
  semester: z.string().min(1, "Required"),
  batch: z.string().min(1, "Required"),
  maxMarks: z.coerce.number().min(1, "Required").default(50),
  duration: z.string().min(1, "Required"),
  dateOfIat: z.string().min(1, "Required"),
  teachingDept: z.string().min(1, "Required"),
  examType: z.string().min(1, "Required"),
  rbtLevels: z.array(z.string()).min(1, "Select at least one RBT level")
});

const steps = [
  { id: 1, name: "Configuration", icon: Settings2 },
  { id: 2, name: "Strategy", icon: FileText },
  { id: 3, name: "Preview", icon: Check }
];

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

  return [
    ...[
      [1, "a", 6, 1],
      [1, "b", 6, 1],
      [1, "c", 8, 1],
      [2, "a", 6, 1],
      [2, "b", 6, 1],
      [2, "c", 8, 1],
      [3, "a", 5, 2],
      [3, "b", 8, 2],
      [3, "c", 7, 2],
      [4, "a", 5, 2],
      [4, "b", 8, 2],
      [4, "c", 7, 2],
      [5, "a", 5, 3],
      [5, "b", 8, 3],
      [5, "c", 7, 3],
      [6, "a", 5, 3],
      [6, "b", 8, 3],
      [6, "c", 7, 3],
      [7, "a", 10, 4],
      [7, "b", 10, 4],
      [8, "a", 10, 4],
      [8, "b", 10, 4],
      [9, "a", 10, 5],
      [9, "b", 10, 5],
      [10, "a", 10, 5],
      [10, "b", 10, 5],
    ] as const,
  ].map(([questionNumber, subpart, marks, moduleNumber]) => ({
    questionNumber,
    subpart,
    label: `${questionNumber}${subpart}`,
    marks,
    moduleNumber,
  }));
}

export default function GeneratePaper() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isAutoGenerate, setIsAutoGenerate] = useState(true);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [generatedPaper, setGeneratedPaper] = useState<any>(null);
  const [manualSearch, setManualSearch] = useState("");
  const [manualSelectedIds, setManualSelectedIds] = useState<number[]>([]);
  const [difficultyDist, setDifficultyDist] = useState({ easy: 30, medium: 50, hard: 20 });
  const [selectedModules, setSelectedModules] = useState<number[]>([1, 2, 3, 4, 5]);
  const [coTargets, setCoTargets] = useState<Record<string, number>>({ 
    "CO1": 20, "CO2": 20, "CO3": 20, "CO4": 20, "CO5": 20 
  });
  const [coDescriptions, setCoDescriptions] = useState<Record<string, string>>({
    CO1: "",
    CO2: "",
    CO3: "",
    CO4: "",
    CO5: "",
  });
  const [instructions, setInstructions] = useState("Instruction: Answer the following questions");

  const { data: subjectsData = [] } = useSubjectsApiV1SubjectsGet();
  const generatePaperMutation = useAIGeneratePaper();
  const downloadMutation = useDownloadPaper();

  const handleDownload = async () => {
    if (!generatedPaper?.id) {
      toast.error("No paper to download");
      return;
    }

    try {
      const blob = await downloadMutation.mutateAsync(generatedPaper.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${generatedPaper.title || 'question_paper'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Paper downloaded successfully!");
    } catch (err) {
      toast.error("Download failed");
    }
  };

  useEffect(() => {
    if (generatePaperMutation.isSuccess && generatePaperMutation.data) {
      setGeneratedQuestions(generatePaperMutation.data.questions || []);
      setGeneratedPaper(generatePaperMutation.data);
      setCurrentStep(3);
      toast.success("Question paper generated successfully!");
    }
    if (generatePaperMutation.isError) {
      toast.error(`Generation failed: ${(generatePaperMutation.error as Error).message || 'Unknown error'}`);
    }
  }, [generatePaperMutation.isSuccess, generatePaperMutation.isError, generatePaperMutation.data, generatePaperMutation.error]);

  const form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      maxMarks: 50,
      rbtLevels: ["L1", "L2", "L3"],
      duration: "1.5 hrs"
    }
  });
  const selectedSubjectId = form.watch("subjectId");
  const selectedMaxMarks = form.watch("maxMarks") || 50;
  const selectedRbtLevels = form.watch("rbtLevels");
  const selectedSubject = subjectsData.find(
    (subject) => subject.id.toString() === selectedSubjectId,
  );
  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          subjectsData
            .map((subject) => subject.department_name)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [subjectsData],
  );
  const blueprint = useMemo(
    () => buildQuestionBlueprint(selectedMaxMarks),
    [selectedMaxMarks],
  );
  const requiredQuestionCount = blueprint.length;
  const { data: bankSummary } = useQuestionBankSummary(
    selectedSubjectId ? parseInt(selectedSubjectId) : undefined,
  );
  const { data: subjectQuestions = [], isLoading: isLoadingManualQuestions } = useQuestions(
    selectedSubjectId ? parseInt(selectedSubjectId) : undefined,
  );

  useEffect(() => {
    if (!selectedSubject) {
      return;
    }

    form.setValue("department", selectedSubject.department_name || "");
    form.setValue("semester", selectedSubject.semester.toString());
    if (!form.getValues("teachingDept")) {
      form.setValue("teachingDept", selectedSubject.department_name || "AIML");
    }
  }, [form, selectedSubject]);

  useEffect(() => {
    setManualSelectedIds([]);
    setManualSearch("");
  }, [selectedSubjectId, selectedMaxMarks]);

  const manualQuestionResults = useMemo(() => {
    const searchTerm = manualSearch.trim().toLowerCase();
    return subjectQuestions.filter((question) => {
      if (selectedModules.length > 0 && !selectedModules.includes(question.module_number)) {
        return false;
      }
      if (selectedRbtLevels.length > 0 && !selectedRbtLevels.includes(question.bloom_level)) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      const haystack = `${question.text} ${question.course_outcome} ${question.bloom_level} ${question.difficulty}`.toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [manualSearch, selectedModules, selectedRbtLevels, subjectQuestions]);

  const manualSelectedQuestions = useMemo(
    () =>
      manualSelectedIds
        .map((questionId) => subjectQuestions.find((question) => question.id === questionId))
        .filter((question): question is NonNullable<typeof question> => Boolean(question)),
    [manualSelectedIds, subjectQuestions],
  );

  const toggleManualQuestion = (questionId: number) => {
    setManualSelectedIds((current) => {
      if (current.includes(questionId)) {
        return current.filter((id) => id !== questionId);
      }
      if (current.length >= requiredQuestionCount) {
        toast.error(`This template needs exactly ${requiredQuestionCount} questions.`);
        return current;
      }
      return [...current, questionId];
    });
  };

  const moveManualQuestion = (index: number, direction: -1 | 1) => {
    setManualSelectedIds((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  };

  const generateQuestions = () => {
    const values = form.getValues();
    if (selectedModules.length === 0) {
      toast.error("Select at least one module");
      return;
    }
    const durationMinutes = values.duration.includes('1.5') ? 90 : parseInt(values.duration) * 60 || 60;
    const subject = subjectsData.find(s => s.id.toString() === values.subjectId);
    const difficultyPreference = Object.entries(difficultyDist).sort((left, right) => right[1] - left[1]);
    const difficulty =
      difficultyPreference.length > 1 &&
      Math.abs(difficultyPreference[0][1] - difficultyPreference[1][1]) < 10
        ? "balanced"
        : difficultyPreference[0]?.[0] || "balanced";

    if (!isAutoGenerate && manualSelectedIds.length !== requiredQuestionCount) {
      toast.error(`Select exactly ${requiredQuestionCount} questions for this template.`);
      return;
    }
    
    generatePaperMutation.mutate({
      subject_id: parseInt(values.subjectId),
      title: `${values.examType} - ${subject?.name || 'Paper'}`,
      exam_type: values.examType,
      semester: values.semester,
      batch: values.batch,
      max_marks: values.maxMarks,
      duration_minutes: durationMinutes,
      exam_date: values.dateOfIat || undefined,
      teaching_department: values.teachingDept,
      prompt: `Generate ${values.examType} paper for ${subject?.name} covering modules ${selectedModules.join(", ")} with RBT levels ${values.rbtLevels.join(", ")} and CO targets ${Object.entries(coTargets).map(([co, value]) => `${co}:${value}%`).join(", ")}`,
      rbt_levels: values.rbtLevels,
      module_numbers: selectedModules,
      co_targets: coTargets,
      co_descriptions: coDescriptions,
      difficulty_distribution: difficultyDist,
      difficulty,
      instructions,
      manual_question_ids: isAutoGenerate ? [] : manualSelectedIds,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif tracking-tight">Generate Question Paper</h1>
        <p className="text-muted-foreground">Follow the steps to configure and generate an AI-powered question paper.</p>
      </div>

      {/* Progress Wizard */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                    isCompleted ? "bg-primary border-primary text-primary-foreground" : 
                    isCurrent ? "bg-background border-primary text-primary" : 
                    "bg-background border-muted text-muted-foreground"
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span className={`text-xs font-medium ${isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Area */}
      <Card className="border-muted shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(() => setCurrentStep(2))}>
                  <CardHeader>
                    <CardTitle>Paper Configuration</CardTitle>
                    <CardDescription>Set up the basic details for the examination.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {departmentOptions.map((department) => (
                                  <SelectItem key={department} value={department}>
                                    {department}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="examType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exam Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select exam type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="IAT-1">First Internal Assessment (IAT-1)</SelectItem>
                                <SelectItem value="IAT-2">Second Internal Assessment (IAT-2)</SelectItem>
                                <SelectItem value="IAT-3">Third Internal Assessment (IAT-3)</SelectItem>
                                <SelectItem value="End-Sem">End Semester</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subjectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subjectsData.map(s => (
                                  <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.name} ({s.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="semester"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Semester</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={`${s}`}>{s}th</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="batch"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Batch</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 2022-26" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="maxMarks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Marks</FormLabel>
                              <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select marks" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="50">50 Marks</SelectItem>
                                  <SelectItem value="100">100 Marks</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1 hr">1 hr</SelectItem>
                                  <SelectItem value="1.5 hrs">1.5 hrs</SelectItem>
                                  <SelectItem value="2 hrs">2 hrs</SelectItem>
                                  <SelectItem value="3 hrs">3 hrs</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="dateOfIat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of IAT</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="teachingDept"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teaching Department</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. AIML Dept" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {selectedSubject && bankSummary && (
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold">Question Bank Readiness</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedSubject.name} currently has {bankSummary.total_questions} indexed questions across {bankSummary.total_documents} uploaded source files.
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-lg bg-background px-3 py-2">
                              <p className="text-lg font-bold">{bankSummary.retrieval_ready_questions}</p>
                              <p className="text-[11px] text-muted-foreground">Retrieval Ready</p>
                            </div>
                            <div className="rounded-lg bg-background px-3 py-2">
                              <p className="text-lg font-bold">{bankSummary.verified_questions}</p>
                              <p className="text-[11px] text-muted-foreground">Verified</p>
                            </div>
                            <div className="rounded-lg bg-background px-3 py-2">
                              <p className="text-lg font-bold">{bankSummary.pending_questions}</p>
                              <p className="text-[11px] text-muted-foreground">Pending</p>
                            </div>
                          </div>
                        </div>
                        {bankSummary.gaps.length > 0 && (
                          <p className="mt-3 text-xs text-amber-700">
                            Coverage watchlist: {bankSummary.gaps.slice(0, 2).join(" ")}
                          </p>
                        )}
                      </div>
                    )}

                    <Separator />

                    <FormField
                      control={form.control}
                      name="rbtLevels"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">RBT Levels to Include</FormLabel>
                            <FormDescription>Select the Bloom's taxonomy levels appropriate for this test.</FormDescription>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {["L1", "L2", "L3", "L4", "L5", "L6"].map((level) => (
                              <FormField
                                key={level}
                                control={form.control}
                                name="rbtLevels"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={level}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(level)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, level])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== level
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {level}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="bg-muted/30 flex justify-end p-4 border-t">
                    <Button type="submit" className="px-8">
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Question Selection Strategy</CardTitle>
                    <CardDescription>Configure how questions should be selected for the paper.</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2 bg-muted p-2 rounded-lg">
                    <Label htmlFor="auto-mode" className={`text-sm cursor-pointer ${!isAutoGenerate ? 'font-bold' : ''}`}>Manual</Label>
                    <Switch 
                      id="auto-mode" 
                      checked={isAutoGenerate} 
                      onCheckedChange={setIsAutoGenerate}
                    />
                    <Label htmlFor="auto-mode" className={`text-sm cursor-pointer ${isAutoGenerate ? 'font-bold text-primary' : ''}`}>AI Auto-Generate</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {isAutoGenerate ? (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Modules to Cover</h3>
                      <div className="grid grid-cols-2 gap-3 rounded-lg border border-muted/50 bg-muted/20 p-4 md:grid-cols-5">
                        {[1, 2, 3, 4, 5].map((moduleNumber) => (
                          <label
                            key={moduleNumber}
                            className="flex items-center gap-3 rounded-md bg-background px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={selectedModules.includes(moduleNumber)}
                              onCheckedChange={(checked) => {
                                setSelectedModules((current) =>
                                  checked
                                    ? [...current, moduleNumber].sort((left, right) => left - right)
                                    : current.filter((value) => value !== moduleNumber),
                                );
                              }}
                            />
                            <span>Module {moduleNumber}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Difficulty Distribution</h3>
                      <div className="space-y-6 bg-muted/20 p-6 rounded-lg border border-muted/50">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>Easy (L1, L2)</Label>
                            <span className="text-sm font-medium">{difficultyDist.easy}%</span>
                          </div>
                          <Slider 
                            value={[difficultyDist.easy]} 
                            max={100} 
                            step={5} 
                            onValueChange={(val) => setDifficultyDist(prev => ({ ...prev, easy: val[0] }))}
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>Medium (L3, L4)</Label>
                            <span className="text-sm font-medium">{difficultyDist.medium}%</span>
                          </div>
                          <Slider 
                            value={[difficultyDist.medium]} 
                            max={100} 
                            step={5} 
                            onValueChange={(val) => setDifficultyDist(prev => ({ ...prev, medium: val[0] }))}
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>Hard (L5, L6)</Label>
                            <span className="text-sm font-medium">{difficultyDist.hard}%</span>
                          </div>
                          <Slider 
                            value={[difficultyDist.hard]} 
                            max={100} 
                            step={5} 
                            onValueChange={(val) => setDifficultyDist(prev => ({ ...prev, hard: val[0] }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">CO Coverage Targets</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {["CO1", "CO2", "CO3", "CO4", "CO5"].map((co) => (
                          <div key={co} className="space-y-2 p-4 border rounded-lg bg-card">
                            <Label className="text-center block w-full">{co}</Label>
                            <Input 
                              type="number" 
                              value={coTargets[co]} 
                              onChange={(e) => setCoTargets(prev => ({ ...prev, [co]: parseInt(e.target.value) || 0 }))}
                              className="text-center" 
                            />
                            <span className="text-xs text-center block text-muted-foreground">%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">CO Descriptions for the Printed Paper</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {["CO1", "CO2", "CO3", "CO4", "CO5"].map((co) => (
                          <div key={co} className="space-y-2">
                            <Label>{co}</Label>
                            <Textarea
                              value={coDescriptions[co]}
                              onChange={(event) =>
                                setCoDescriptions((current) => ({
                                  ...current,
                                  [co]: event.target.value,
                                }))
                              }
                              rows={2}
                              placeholder={`Description for ${co}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Instruction Line</Label>
                      <Textarea
                        value={instructions}
                        onChange={(event) => setInstructions(event.target.value)}
                        rows={2}
                        placeholder="Instruction: Answer the following questions"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
                        <h3 className="text-lg font-medium">Manual Selection Mode</h3>
                        <p className="text-sm text-muted-foreground">
                          Select exactly {requiredQuestionCount} questions. Their order in the selected list becomes the final paper order and slot mapping.
                        </p>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={manualSearch}
                          onChange={(event) => setManualSearch(event.target.value)}
                          placeholder="Search the selected subject question bank..."
                          className="pl-9"
                        />
                      </div>
                      <div className="max-h-[460px] overflow-y-auto rounded-lg border">
                        {isLoadingManualQuestions ? (
                          <div className="p-6 text-sm text-muted-foreground">
                            Loading question bank...
                          </div>
                        ) : manualQuestionResults.length === 0 ? (
                          <div className="p-6 text-sm text-muted-foreground">
                            No questions match the current subject, module, and RBT filters.
                          </div>
                        ) : (
                          <div className="divide-y">
                            {manualQuestionResults.map((question) => {
                              const selectedIndex = manualSelectedIds.indexOf(question.id);
                              const isSelected = selectedIndex >= 0;
                              return (
                                <button
                                  key={question.id}
                                  type="button"
                                  onClick={() => toggleManualQuestion(question.id)}
                                  className={`w-full px-4 py-3 text-left transition-colors ${
                                    isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium leading-relaxed">
                                        {question.text}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Module {question.module_number} • {question.course_outcome} • {question.bloom_level} • {question.difficulty} • {question.marks} marks
                                      </p>
                                    </div>
                                    <div className="shrink-0 text-xs font-medium">
                                      {isSelected ? `Slot ${blueprint[selectedIndex]?.label}` : "Add"}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Selected Questions</h3>
                          <p className="text-sm text-muted-foreground">
                            {manualSelectedQuestions.length}/{requiredQuestionCount} chosen
                          </p>
                        </div>
                      </div>
                      <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                        {manualSelectedQuestions.length === 0 ? (
                          <div className="rounded-lg border border-dashed bg-background px-4 py-6 text-sm text-muted-foreground">
                            Pick questions from the left panel to build the paper.
                          </div>
                        ) : (
                          manualSelectedQuestions.map((question, index) => (
                            <div key={question.id} className="rounded-lg border bg-background p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Slot {blueprint[index]?.label} • Module {question.module_number}
                                  </p>
                                  <p className="text-sm leading-relaxed">{question.text}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {question.course_outcome} • {question.bloom_level} • {question.difficulty} • {question.marks} marks
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-col gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => moveManualQuestion(index, -1)}
                                    disabled={index === 0}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => moveManualQuestion(index, 1)}
                                    disabled={index === manualSelectedQuestions.length - 1}
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => toggleManualQuestion(question.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 flex justify-between p-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                <Button onClick={generateQuestions} disabled={generatePaperMutation.isPending} className="px-8">
                  {generatePaperMutation.isPending ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      Generate Paper <Zap className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle>Preview & Download</CardTitle>
                  <CardDescription>Review the generated paper before downloading.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={generateQuestions}>
                    <RotateCw className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                  <Button size="sm" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" /> Download .docx
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-muted/30">
                <div className="p-6 overflow-x-auto">
                  <div className="min-w-[800px] bg-white p-8 shadow-sm border mx-auto text-black">
                    <PaperPreview 
                      formData={{
                        ...form.getValues(),
                        subjectName: selectedSubject?.name || 'Subject',
                        subjectCode: selectedSubject?.code || generatedPaper?.subject_code || "N/A",
                        department: form.getValues().department || generatedPaper?.department_name || "Department",
                        instructions,
                        coDescriptions,
                      }} 
                      questions={generatedQuestions || []}
                      generatedPaper={generatedPaper}
                    />
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

function Zap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
