import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  Copy,
  Check,
  GraduationCap,
  ListOrdered,
  FileText,
  HelpCircle,
  Bot,
  Info,
  ClipboardList,
  Stethoscope,
  Clock,
  Activity,
  AlertTriangle,
  Zap,
  Thermometer,
  AlertCircle,
  Link2,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { CropDiseaseItem, SEED_100_CROP_DISEASES } from '../data/seed100CropDiseases';
import {
  CropDiseaseDocumentary,
  getDiseaseDocumentary,
  formatDiseaseAsMarkdown,
} from '../data/diseaseDocumentaryService';
import { useAgriPulse } from '../context/AgriPulseContext';

const ON_THIS_PAGE_SECTIONS = [
  { id: 'sec-indications', label: 'Symptoms & Indications', icon: Stethoscope },
  { id: 'sec-dosage', label: 'Spray Dosage & Regimen', icon: Clock },
  { id: 'sec-administration', label: 'Field Management Guide', icon: Layers },
  { id: 'sec-damage', label: 'Crop Loss & Side Effects', icon: Activity },
  { id: 'sec-warnings', label: 'Warnings & Cautions', icon: AlertCircle },
  { id: 'sec-interactions', label: 'Soil & Nutrient Interactions', icon: AlertTriangle },
  { id: 'sec-mechanism', label: 'Mechanism of Action', icon: Zap },
  { id: 'sec-storage', label: 'Storage & Handling', icon: Thermometer },
  { id: 'sec-seek-care', label: 'When to Seek Care', icon: Info },
  { id: 'sec-faqs', label: 'Clinical & Field FAQs', icon: HelpCircle },
  { id: 'sec-alternatives', label: 'Resistant Alternatives', icon: Link2 },
  { id: 'sec-sources', label: 'Compendia Sources', icon: FileText },
];

function splitIntoCleanBullets(text: string): string[] {
  const raw = text
    .split(/(?:;\s*|\.\s+(?=[A-Z0-9•])|\n+)/)
    .map((s) => s.replace(/^[•\-*]\s*/, '').trim())
    .filter((s) => s.length > 5);
  return raw.length > 0 ? raw.map((s) => (s.endsWith('.') ? s.slice(0, -1) : s)) : [text];
}

export const DiseaseAnalysisPage: React.FC = () => {
  const { openChatWithPrompt } = useAgriPulse();
  const { diseaseId } = useParams<{ diseaseId?: string }>();
  const navigate = useNavigate();

  const [diseaseSearch, setDiseaseSearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('All');
  const [selectedPathogenFilter, setSelectedPathogenFilter] = useState<string>('All');

  const [selectedDiseaseId, setSelectedDiseaseId] = useState<number | null>(() => {
    if (diseaseId) {
      const parsed = parseInt(diseaseId, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  });

  // Sync URL param with selectedDiseaseId
  useEffect(() => {
    if (diseaseId) {
      const parsed = parseInt(diseaseId, 10);
      if (!isNaN(parsed)) {
        setSelectedDiseaseId(parsed);
        return;
      }
    }
    setSelectedDiseaseId(null);
  }, [diseaseId]);

  const [activeSectionId, setActiveSectionId] = useState<string>('sec-indications');
  const [showAll25Numbered, setShowAll25Numbered] = useState<boolean>(false);
  const [examFocusMode, setExamFocusMode] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const filteredDiseases = useMemo(() => {
    return SEED_100_CROP_DISEASES.filter((d) => {
      if (selectedGroupFilter !== 'All' && d.cropGroup !== selectedGroupFilter) return false;
      if (selectedPathogenFilter !== 'All' && d.pathogenType !== selectedPathogenFilter) return false;
      if (diseaseSearch.trim()) {
        const q = diseaseSearch.trim().toLowerCase();
        const str = `${d.crop} ${d.disease} ${d.scientificName} ${d.primarySymptoms}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [diseaseSearch, selectedGroupFilter, selectedPathogenFilter]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { All: SEED_100_CROP_DISEASES.length };
    SEED_100_CROP_DISEASES.forEach((d) => {
      counts[d.cropGroup] = (counts[d.cropGroup] || 0) + 1;
    });
    return counts;
  }, []);

  // Currently opened disease for the Infographic view
  const activeDiseaseItem: CropDiseaseItem | null = useMemo(() => {
    if (selectedDiseaseId === null) return null;
    return SEED_100_CROP_DISEASES.find((d) => d.id === selectedDiseaseId) || null;
  }, [selectedDiseaseId]);

  const activeDocumentary: CropDiseaseDocumentary | null = useMemo(() => {
    if (!activeDiseaseItem) return null;
    return getDiseaseDocumentary(activeDiseaseItem);
  }, [activeDiseaseItem]);

  const handleOpenDisease = (item: CropDiseaseItem) => {
    setSelectedDiseaseId(item.id);
    setActiveSectionId('sec-indications');
    navigate(`/disease/${item.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDirectory = () => {
    setSelectedDiseaseId(null);
    navigate('/disease');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyMarkdown = (doc: CropDiseaseDocumentary) => {
    const md = formatDiseaseAsMarkdown(doc);
    navigator.clipboard.writeText(md).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isHighYield = (num: number) => [1, 2, 3, 6, 8, 11, 14, 17, 20].includes(num);

  // Structured bullet points for the 2-column infographic checkmark cards
  const symptomIndications = useMemo(() => {
    if (!activeDocumentary || !activeDiseaseItem) return [];
    const points = [
      ...splitIntoCleanBullets(activeDocumentary.symptomsAndSigns),
      ...splitIntoCleanBullets(activeDocumentary.diagnosisAndIdentification),
    ];
    const unique = Array.from(new Set(points));
    if (unique.length < 4) {
      unique.push(
        `Clinical management of targeted conditions associated with ${activeDiseaseItem.pathogenType.toLowerCase()} infection`,
        `Early canopy & vascular inspection in ${activeDocumentary.affectedCrops} under ${activeDiseaseItem.favorableConditions.toLowerCase()}`
      );
    }
    return unique.slice(0, 6);
  }, [activeDocumentary, activeDiseaseItem]);

  const administrationSteps = useMemo(() => {
    if (!activeDocumentary) return [];
    const points = [
      ...splitIntoCleanBullets(activeDocumentary.integratedDiseaseManagement),
      ...splitIntoCleanBullets(activeDocumentary.prevention),
    ];
    return Array.from(new Set(points)).slice(0, 6);
  }, [activeDocumentary]);

  const resistantAndBioList = useMemo(() => {
    if (!activeDocumentary) return [];
    const varieties = activeDocumentary.resistantVarieties
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 4)
      .map((v) => `Resistant / Tolerant Host Line: ${v}`);
    const bio = splitIntoCleanBullets(activeDocumentary.biologicalControl).slice(0, 2);
    return [...varieties, ...bio];
  }, [activeDocumentary]);

  // ==========================================================================
  // VIEW 1: WHEN A DISEASE IS CLICKED -> FULL INFOGRAPHIC MONOGRAPH PAGE
  // (Matches the attached GlobalHealth screenshots)
  // ==========================================================================
  if (activeDiseaseItem && activeDocumentary) {
    const prevId = activeDiseaseItem.id > 1 ? activeDiseaseItem.id - 1 : null;
    const nextId = activeDiseaseItem.id < SEED_100_CROP_DISEASES.length ? activeDiseaseItem.id + 1 : null;

    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-200">
        {/* Clean Navigation & Disease Switcher Bar */}
        <div className="bg-white px-5 py-4 rounded-[24px] border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.04)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleBackToDirectory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Diseases</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#065f46] border border-[#bbf7d0]">
                #{String(activeDiseaseItem.id).padStart(2, '0')}
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {activeDiseaseItem.crop} • {activeDiseaseItem.cropGroup}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800">
                {activeDiseaseItem.pathogenType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Switch disease monograph"
              value={activeDiseaseItem.id}
              onChange={(e) => {
                const target = SEED_100_CROP_DISEASES.find((d) => d.id === Number(e.target.value));
                if (target) handleOpenDisease(target);
              }}
              className="px-3.5 py-2 rounded-full border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[220px] sm:max-w-xs"
            >
              {SEED_100_CROP_DISEASES.map((d) => (
                <option key={d.id} value={d.id}>
                  #{String(d.id).padStart(2, '0')} — {d.disease} ({d.crop})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!prevId}
              onClick={() => {
                if (!prevId) return;
                const target = SEED_100_CROP_DISEASES.find((d) => d.id === prevId);
                if (target) handleOpenDisease(target);
              }}
              className="p-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              title="Previous Disease"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!nextId}
              onClick={() => {
                if (!nextId) return;
                const target = SEED_100_CROP_DISEASES.find((d) => d.id === nextId);
                if (target) handleOpenDisease(target);
              }}
              className="p-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              title="Next Disease"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TWO-COLUMN INFOGRAPHIC MONOGRAPH LAYOUT (Matches GlobalHealth Screenshots) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* LEFT MAIN MONOGRAPH COLUMN (8 COLS) */}
          <div className="lg:col-span-8 space-y-7">
            {/* TOP AI ASSISTANT BANNER CARD (Matches "Ask GlobalHealth AI about Paracetamol") */}
            <div className="rounded-[28px] bg-[#f3fdf8] border border-[#a7f3d0] p-6 sm:p-8 shadow-[0_2px_12px_-4px_rgba(16,185,129,0.08)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bot className="w-6 h-6 text-[#16a34a] shrink-0" />
                  <h2 className="text-lg sm:text-[20px] font-extrabold text-slate-900 tracking-tight">
                    Ask AGRIPULSE AI about {activeDocumentary.diseaseName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openChatWithPrompt(
                      `Explain how ${activeDocumentary.diseaseName} works in simple terms.`
                    )
                  }
                  className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-[#1f5f72] hover:bg-[#164857] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors shrink-0"
                >
                  Open AI Assistant
                </button>
              </div>

              {/* Rounded White Prompt Pills */}
              <div className="flex flex-wrap gap-2.5">
                {[
                  `Explain how ${activeDocumentary.diseaseName} works in simple terms.`,
                  `What are the most common symptoms of ${activeDocumentary.diseaseName}?`,
                  `Can I treat ${activeDocumentary.diseaseName} with bio-agents or fungicides?`,
                  `What should I do if ${activeDocumentary.diseaseName} spreads after rain?`,
                  `What are the safe resistant varieties for ${activeDocumentary.diseaseName}?`,
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openChatWithPrompt(promptText)}
                    className="text-left px-4 sm:px-5 py-2.5 rounded-full bg-white hover:bg-emerald-50/60 text-slate-700 hover:text-slate-950 border border-slate-200/90 hover:border-emerald-300 text-xs sm:text-[14px] font-medium transition-all shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                  >
                    &ldquo;{promptText}&rdquo;
                  </button>
                ))}
              </div>

              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed pt-1">
                AI responses summarize curated reference material and demo data. They are intended for farmer education and do not replace individualized agronomic advice from your agricultural extension officer.
              </p>
            </div>

            {/* 1. OVERVIEW & WHAT IS {DISEASE}? (Matches Screenshot 2 Card 1) */}
            <section
              id="sec-overview"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Info className="w-6 h-6 text-[#16a34a] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  1. Overview &amp; What is {activeDocumentary.diseaseName}?
                </h2>
              </div>

              <p className="text-base sm:text-[17.5px] text-slate-700 leading-[1.75]">
                {activeDocumentary.definition} It is primarily observed and diagnosed in{' '}
                <span className="font-medium text-slate-900">
                  {activeDocumentary.affectedCrops}
                </span>
                . Formulated management strategies across multiple stages including{' '}
                {activeDocumentary.seasonOfOccurrence.toLowerCase()} are utilized globally and in Indian agricultural practice under evidence-based plant protection guidelines.
              </p>

              {/* Highlighted Green Callout Box (Matches "PHARMACOLOGICAL CLASS & CATEGORY:") */}
              <div className="rounded-2xl bg-[#f3fdf8] border border-[#bbf7d0] p-5 sm:p-6 space-y-1.5">
                <div className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-[#065f46]">
                  PATHOLOGICAL CLASS &amp; CATEGORY:
                </div>
                <p className="text-sm sm:text-[15.5px] text-slate-800 leading-relaxed">
                  Classified pathologically as a{' '}
                  <strong className="font-extrabold text-slate-950">
                    {activeDiseaseItem.pathogenType} ({activeDocumentary.causalOrganism})
                  </strong>{' '}
                  within the{' '}
                  <strong className="font-extrabold text-slate-950">
                    {activeDiseaseItem.cropGroup} &amp; Primary Crop Care
                  </strong>{' '}
                  protection scope.
                </p>
              </div>
            </section>

            {/* 2. QUICK PATHOLOGICAL FACTS (Matches Screenshot 2 "2. Quick Clinical Facts") */}
            <section
              id="sec-quick-facts"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <ClipboardList className="w-6 h-6 text-[#16a34a] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  2. Quick Pathological Facts
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-1.5">
                  <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    CAUSAL ORGANISM
                  </div>
                  <div className="text-base sm:text-[17px] font-extrabold text-slate-950 leading-snug">
                    {activeDocumentary.causalOrganism} ({activeDiseaseItem.pathogenType})
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-1.5">
                  <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    SURVEILLANCE STATUS
                  </div>
                  <div className="text-base sm:text-[17px] font-extrabold text-slate-950 leading-snug">
                    ICAR Priority Watch
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-1.5">
                  <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    PRIMARY HOST CROP
                  </div>
                  <div className="text-base sm:text-[17px] font-extrabold text-slate-950 leading-snug">
                    {activeDiseaseItem.crop}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-1.5">
                  <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    PRIMARY SPREAD ROUTE
                  </div>
                  <div className="text-sm sm:text-[15px] font-extrabold text-slate-950 leading-snug">
                    {activeDocumentary.modeOfTransmission.split(';')[0]}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-1.5">
                  <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    ACTIVE SEASON
                  </div>
                  <div className="text-sm sm:text-[15px] font-extrabold text-slate-950 leading-snug">
                    {activeDocumentary.seasonOfOccurrence}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-1.5">
                  <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    GEOGRAPHICAL BELT
                  </div>
                  <div className="text-sm sm:text-[15px] font-extrabold text-slate-950 leading-snug line-clamp-2">
                    {activeDocumentary.geographicalDistribution}
                  </div>
                </div>
              </div>
            </section>

            {/* 3. REFERENCE FIELD SYMPTOMS & DIAGNOSTIC INDICATIONS (Matches Screenshot 1 Card 3) */}
            <section
              id="sec-indications"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Stethoscope className="w-6 h-6 text-[#2563eb] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  3. Reference Field Symptoms &amp; Diagnostic Indicators
                </h2>
              </div>

              <p className="text-sm sm:text-[15.5px] text-slate-600 leading-relaxed">
                Reference symptoms from the educational dataset. Confirm diagnoses with a qualified local agronomist or plant pathologist:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {symptomIndications.map((itemText, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 flex items-start gap-3.5"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#16a34a] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-[15px] font-semibold text-slate-900 leading-relaxed">
                      {itemText}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. SPRAY DOSAGE & TREATMENT REGIMEN */}
            <section
              id="sec-dosage"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Clock className="w-6 h-6 text-[#16a34a] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  4. Spray Dosage &amp; Treatment Regimen
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-2">
                  <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#065f46]">
                    CHEMICAL CONTROL &amp; FOLIAR REGIMEN
                  </div>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-relaxed">
                    {activeDocumentary.chemicalControl}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-2">
                  <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#065f46]">
                    BIOLOGICAL SEED &amp; SOIL REGIMEN
                  </div>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-relaxed">
                    {activeDocumentary.biologicalControl}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f3fdf8] border border-[#bbf7d0] p-5 space-y-1">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#065f46]">
                  ECONOMIC THRESHOLD TRIGGER (ETL):
                </div>
                <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed">
                  {activeDocumentary.controlAndTreatment}
                </p>
              </div>
            </section>

            {/* 5. FIELD MANAGEMENT & ADMINISTRATION GUIDE */}
            <section
              id="sec-administration"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Layers className="w-6 h-6 text-[#2563eb] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  5. Field Management &amp; Administration Guide
                </h2>
              </div>

              <p className="text-sm sm:text-[15.5px] text-slate-600 leading-relaxed">
                Standardized cultural and Integrated Disease Management (IDM) steps for field implementation:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {administrationSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 flex items-start gap-3.5"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#16a34a] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-[15px] font-semibold text-slate-900 leading-relaxed">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. CROP LOSS & PHYSIOLOGICAL SIDE EFFECTS */}
            <section
              id="sec-damage"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-5 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Activity className="w-6 h-6 text-rose-600 shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  6. Economic Crop Losses &amp; Physiological Effects
                </h2>
              </div>

              <p className="text-base sm:text-[16.5px] text-slate-700 leading-relaxed">
                {activeDocumentary.effectsAndCropLosses}
              </p>
            </section>

            {/* 7. WEATHER WARNINGS & FIELD CAUTIONS + NUTRIENT INTERACTIONS */}
            <section
              id="sec-warnings"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  7. Warnings, Cautions &amp; Nutrient Interactions
                </h2>
              </div>

              <div id="sec-interactions" className="grid grid-cols-1 sm:grid-cols-2 gap-4 scroll-mt-24">
                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-2">
                  <div className="text-[12px] font-extrabold uppercase tracking-wider text-amber-800">
                    FAVOURABLE WEATHER &amp; EPIDEMIC TRIGGERS
                  </div>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-relaxed">
                    {activeDocumentary.favourableConditions}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-2">
                  <div className="text-[12px] font-extrabold uppercase tracking-wider text-slate-700">
                    FERTILIZER, WATER &amp; SOIL INTERACTIONS
                  </div>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-relaxed">
                    Excessive nitrogenous top-dressing (Urea) and poor plot drainage increase host tissue succulence. Balance NPK with Potash (K) and micronutrients to fortify epidermal cell walls.
                  </p>
                </div>
              </div>
            </section>

            {/* 8. MECHANISM OF INFECTION & DISEASE CYCLE */}
            <section
              id="sec-mechanism"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Zap className="w-6 h-6 text-[#16a34a] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  8. Mechanism of Action &amp; Disease Cycle
                </h2>
              </div>

              <p className="text-base sm:text-[16.5px] text-slate-700 leading-relaxed">
                {activeDocumentary.causes} {activeDocumentary.diseaseCycle}
              </p>

              <div className="rounded-2xl bg-[#f3fdf8] border border-[#bbf7d0] p-5 space-y-1.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#065f46] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#16a34a]" />
                  <span>HIGH-YIELD PATHOLOGY &amp; EXAM MECHANISM:</span>
                </div>
                <p className="text-sm sm:text-[15px] text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                  {activeDocumentary.importantFactsForExams}
                </p>
              </div>
            </section>

            {/* 9. SEED & RESIDUE STORAGE + WHEN TO SEEK CARE */}
            <section
              id="sec-storage"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Thermometer className="w-6 h-6 text-[#2563eb] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  9. Storage, Handling &amp; When to Seek Care
                </h2>
              </div>

              <div id="sec-seek-care" className="grid grid-cols-1 sm:grid-cols-2 gap-4 scroll-mt-24">
                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-2">
                  <div className="text-[12px] font-extrabold uppercase tracking-wider text-slate-600">
                    SEED STORAGE &amp; CROP RESIDUE SANITATION
                  </div>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-relaxed">
                    {activeDocumentary.prevention}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-2">
                  <div className="text-[12px] font-extrabold uppercase tracking-wider text-slate-600">
                    WHEN TO SEEK KVK CARE &amp; CASE STUDY
                  </div>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-relaxed">
                    {activeDocumentary.realLifeCaseStudy}
                  </p>
                </div>
              </div>
            </section>

            {/* 10. CLINICAL & FIELD FAQS */}
            <section
              id="sec-faqs"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <HelpCircle className="w-6 h-6 text-[#16a34a] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  10. Clinical &amp; Agronomic FAQs
                </h2>
              </div>

              <div className="space-y-4">
                {activeDocumentary.frequentlyAskedQuestions.map((faq, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 space-y-2"
                  >
                    <h3 className="text-base font-extrabold text-slate-900">
                      {faq.question}
                    </h3>
                    <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 11. RESISTANT VARIETIES & BIO-CONTROL ALTERNATIVES */}
            <section
              id="sec-alternatives"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Link2 className="w-6 h-6 text-[#16a34a] shrink-0" />
                <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                  11. Resistant Varieties &amp; Bio-Control Alternatives
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resistantAndBioList.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-5 flex items-start gap-3.5"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#16a34a] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-[15px] font-semibold text-slate-900 leading-relaxed">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* 12. COMPENDIA SOURCES & FULL 25-HEADING TABLE TOGGLE */}
            <section
              id="sec-sources"
              className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-9 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-6 scroll-mt-24"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-700 shrink-0" />
                  <h2 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight">
                    12. Compendia Sources &amp; Complete 25-Heading Dossier
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyMarkdown(activeDocumentary)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAll25Numbered(!showAll25Numbered)}
                    className="px-4 py-2 rounded-xl bg-[#1f5f72] hover:bg-[#164857] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>{showAll25Numbered ? 'Hide 1–25 Table' : 'Show All 25 Headings'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeDocumentary.referencesAndSources.map((ref, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-4 flex items-start gap-3"
                  >
                    <ShieldCheck className="w-5 h-5 text-[#16a34a] shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold text-slate-800 leading-relaxed">
                      {ref}
                    </span>
                  </div>
                ))}
              </div>

              {showAll25Numbered && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Standardized 25-Heading Plant Pathology Table
                    </span>
                    <button
                      type="button"
                      onClick={() => setExamFocusMode(!examFocusMode)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                        examFocusMode
                          ? 'bg-amber-100 border-amber-300 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Exam Highlight {examFocusMode ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {[
                      { num: 1, title: 'Disease Name', val: activeDocumentary.diseaseName },
                      { num: 2, title: 'Definition', val: activeDocumentary.definition },
                      { num: 3, title: 'Causal Organism / Pathogen', val: activeDocumentary.causalOrganism },
                      { num: 4, title: 'Affected Crops', val: activeDocumentary.affectedCrops },
                      { num: 5, title: 'Causes', val: activeDocumentary.causes },
                      { num: 6, title: 'Symptoms and Signs', val: activeDocumentary.symptomsAndSigns },
                      { num: 7, title: 'Disease Cycle', val: activeDocumentary.diseaseCycle },
                      { num: 8, title: 'Mode of Transmission / Spread', val: activeDocumentary.modeOfTransmission },
                      { num: 9, title: 'Favourable Conditions', val: activeDocumentary.favourableConditions },
                      { num: 10, title: 'Effects and Crop Losses', val: activeDocumentary.effectsAndCropLosses },
                      { num: 11, title: 'Diagnosis and Identification', val: activeDocumentary.diagnosisAndIdentification },
                      { num: 12, title: 'Prevention', val: activeDocumentary.prevention },
                      { num: 13, title: 'Control and Treatment', val: activeDocumentary.controlAndTreatment },
                      { num: 14, title: 'Resistant Varieties', val: activeDocumentary.resistantVarieties },
                      { num: 15, title: 'Biological Control', val: activeDocumentary.biologicalControl },
                      { num: 16, title: 'Chemical Control', val: activeDocumentary.chemicalControl },
                      { num: 17, title: 'Integrated Disease Management', val: activeDocumentary.integratedDiseaseManagement },
                      { num: 18, title: 'Season of Occurrence', val: activeDocumentary.seasonOfOccurrence },
                      { num: 19, title: 'Geographical Distribution', val: activeDocumentary.geographicalDistribution },
                      { num: 20, title: 'Important Facts for Exams', val: activeDocumentary.importantFactsForExams },
                      {
                        num: 21,
                        title: 'Frequently Asked Questions (FAQs)',
                        val: activeDocumentary.frequentlyAskedQuestions
                          .map((f) => `Q: ${f.question} — A: ${f.answer}`)
                          .join(' | '),
                      },
                      { num: 22, title: 'Interesting Facts', val: activeDocumentary.interestingFacts },
                      { num: 23, title: 'Real-Life Case Study', val: activeDocumentary.realLifeCaseStudy },
                      { num: 24, title: 'Latest Research and AI-Based Detection', val: activeDocumentary.latestResearchAndAiDetection },
                      { num: 25, title: 'References and Sources', val: activeDocumentary.referencesAndSources.join('; ') },
                    ].map((row) => (
                      <div
                        key={row.num}
                        className={`p-4 text-xs sm:text-sm grid grid-cols-1 sm:grid-cols-12 gap-2 ${
                          examFocusMode && isHighYield(row.num) ? 'bg-amber-50/70' : 'bg-white'
                        }`}
                      >
                        <div className="sm:col-span-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#1f5f72] text-white text-[10px] flex items-center justify-center shrink-0">
                            {row.num}
                          </span>
                          <span>{row.title}</span>
                        </div>
                        <div className="sm:col-span-8 text-slate-700 whitespace-pre-line leading-relaxed">
                          {row.val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT STICKY SIDEBAR COLUMN (4 COLS — Matches GlobalHealth Screenshot 1 & 2) */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-5">
            {/* CARD 1: ON THIS PAGE */}
            <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 sm:p-7 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-4">
              <div className="space-y-2.5">
                <div className="text-[12.5px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                  ON THIS PAGE
                </div>
                <div className="w-full h-2 rounded-full bg-[#ecfdf5] relative overflow-hidden">
                  <div className="w-5 h-0.5 bg-[#10b981] absolute top-0 left-3 rounded-full" />
                </div>
              </div>

              <nav aria-label="On this page navigation" className="space-y-1 pt-1">
                {ON_THIS_PAGE_SECTIONS.map((sec) => {
                  const IconComponent = sec.icon;
                  const isActive = activeSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all flex items-center gap-3.5 ${
                        isActive
                          ? 'bg-[#f0fdf4] text-[#065f46] font-bold'
                          : 'text-[#475569] hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <IconComponent
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#16a34a]' : 'text-[#94a3b8]'
                        }`}
                      />
                      <span className="truncate">{sec.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* CARD 2: NEED A PLAIN EXPLANATION? (Matches bottom-right green box in Screenshot 1 & 2) */}
            <div
              onClick={() =>
                openChatWithPrompt(
                  `Break down spray dosages, safety precautions, and organic alternatives for ${activeDocumentary.diseaseName} in plain language.`
                )
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openChatWithPrompt(
                    `Break down spray dosages, safety precautions, and organic alternatives for ${activeDocumentary.diseaseName} in plain language.`
                  );
                }
              }}
              className="rounded-[28px] bg-[#f0fdf4] hover:bg-[#dcfce7]/70 border border-[#bbf7d0] p-6 sm:p-7 shadow-[0_2px_12px_-4px_rgba(16,185,129,0.06)] space-y-2.5 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-[#16a34a] shrink-0" />
                <h3 className="text-[15px] font-extrabold text-slate-900">
                  Need a plain explanation?
                </h3>
              </div>
              <p className="text-[13.5px] text-[#065f46] leading-relaxed">
                Ask AGRIPULSE AI to break down spray dosages, safety precautions, or compare with alternative resistant varieties and bio-controls.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: DEFAULT 100 CROP DISEASES DIRECTORY GRID
  // (Clicking any disease card opens View 1 above!)
  // ==========================================================================
  return (
    <div className="space-y-6 pb-12">
      {/* Top Directory Header */}
      <div className="bg-white p-6 sm:p-7 rounded-[28px] border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#065f46] text-xs font-bold mb-2">
              <BookOpen className="w-3.5 h-3.5 text-[#16a34a]" />
              <span>Crop Diseases Encyclopedia &amp; Infographic Monographs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Crop Diseases Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Click any crop disease below to open its full interactive <strong>Infographic Monograph</strong> with AI assistant prompts, quick pathological facts, diagnostic indications, spray regimens, and compendia sources.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3.5 py-2 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#065f46] text-xs font-extrabold">
              Showing {filteredDiseases.length} of {SEED_100_CROP_DISEASES.length} Diseases
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={diseaseSearch}
              onChange={(e) => setDiseaseSearch(e.target.value)}
              placeholder="Search across crop diseases (e.g., Rice blast, Apple scab, Stewart's wilt, Bacterial canker)..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 focus:bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {diseaseSearch && (
              <button
                type="button"
                onClick={() => setDiseaseSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              'All',
              'Rice',
              'Wheat & Barley',
              'Maize & Millets',
              'Pulses',
              'Oilseeds & Commercial',
              'Vegetables',
              'Fruits',
            ].map((grp) => {
              const count = groupCounts[grp] || 0;
              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setSelectedGroupFilter(grp)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedGroupFilter === grp
                      ? 'bg-[#1f5f72] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{grp}</span>
                  <span
                    className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedGroupFilter === grp
                        ? 'bg-black/20 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Pathogen:
            </span>
            {['All', 'Fungi', 'Bacteria', 'Viruses', 'Oomycetes', 'Phytoplasmas'].map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => setSelectedPathogenFilter(path)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                  selectedPathogenFilter === path
                    ? 'bg-[#16a34a] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {path}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 100 Disease Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDiseases.map((d) => (
          <div
            key={d.id}
            onClick={() => handleOpenDisease(d)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleOpenDisease(d);
            }}
            className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-[#16a34a] transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  #{String(d.id).padStart(2, '0')}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    d.pathogenType === 'Fungi'
                      ? 'bg-amber-100 text-amber-900'
                      : d.pathogenType === 'Bacteria'
                      ? 'bg-blue-100 text-blue-900'
                      : d.pathogenType === 'Viruses'
                      ? 'bg-rose-100 text-rose-900'
                      : d.pathogenType === 'Oomycetes'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-purple-100 text-purple-900'
                  }`}
                >
                  {d.pathogenType}
                </span>
              </div>

              <div className="text-[11px] font-extrabold text-[#16a34a] uppercase tracking-wider">
                {d.crop}
              </div>

              <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-[#16a34a] transition-colors mt-0.5">
                {d.disease}
              </h2>

              <p className="text-xs font-mono italic text-slate-500 mt-0.5">
                {d.scientificName}
              </p>

              <div className="mt-4 p-4 bg-[#f8fafc] rounded-2xl text-xs text-slate-700 space-y-1.5 border border-slate-100">
                <p className="line-clamp-2 leading-relaxed">
                  <strong className="text-slate-900">Symptoms:</strong> {d.primarySymptoms}
                </p>
                <p className="line-clamp-2 text-slate-600 text-[11px]">
                  <strong>Favorable:</strong> {d.favorableConditions}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-slate-500">{d.cropGroup}</span>
              <span className="font-bold text-[#16a34a] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Open Infographic <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredDiseases.length === 0 && (
        <div className="bg-white rounded-[28px] border border-slate-200 p-12 text-center space-y-3">
          <p className="text-sm font-bold text-slate-900">No matching crop diseases found.</p>
          <p className="text-xs text-slate-500">
            Try clearing your search query or resetting the crop category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setDiseaseSearch('');
              setSelectedGroupFilter('All');
              setSelectedPathogenFilter('All');
            }}
            className="text-xs font-bold px-4 py-2 bg-[#1f5f72] text-white rounded-xl hover:bg-[#164857] transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
};
