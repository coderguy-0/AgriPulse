import {
  ChatMessage,
  CropRecord,
  DictionaryEntry,
  Farm,
  FarmActivity,
  FarmerProfile,
  FieldObservation,
  IoTDevice,
  GovernmentScheme,
  StoreProduct,
  WeatherSnapshot,
} from '../types';
import { formatPaiseToINR } from '../utils/formatters';
import { SEED_100_CROP_DISEASES } from '../data/seed100CropDiseases';
import { getDiseaseDocumentary } from '../data/diseaseDocumentaryService';

export interface AssistantContext {
  profile: FarmerProfile;
  activeFarm?: Farm;
  farms: Farm[];
  crops: CropRecord[];
  observations: FieldObservation[];
  activities: FarmActivity[];
  devices: IoTDevice[];
  weather: WeatherSnapshot;
  dictionary: DictionaryEntry[];
  products: StoreProduct[];
  schemes: GovernmentScheme[];
  recentMessages: ChatMessage[];
}

export async function generateAssistantReply(
  userQuery: string,
  ctx: AssistantContext
): Promise<Omit<ChatMessage, 'id' | 'timestamp'>> {
  if (!ctx.profile.isDemoAccount) {
    return {
      sender: 'assistant', modeLabel: 'Service unavailable',
      text: 'AgriSense AI Advisor is not connected to an AI provider. No model has reviewed your question, farm, sensors or weather. You can still browse the reference library and record field observations. For crop damage or treatment decisions, consult your local KVK or a qualified agronomist.',
      suggestedLinks: [{ label: 'Crop disease reference', route: '/disease' }, { label: 'Record an observation', route: '/farm' }],
    };
  }

  const q = userQuery.trim().toLowerCase();
  const activeFarm = ctx.activeFarm || ctx.farms.find((f) => !f.isArchived) || ctx.farms[0];
  const farmCrops = activeFarm
    ? ctx.crops.filter((c) => c.farmId === activeFarm.id)
    : ctx.crops;
  const pendingActivities = ctx.activities.filter((a) => a.status === 'Pending');
  const latestObs = activeFarm
    ? ctx.observations.filter((o) => o.farmId === activeFarm.id)
    : ctx.observations;

  // 0. Check if query asks about a specific disease from the 100 Crop Diseases Encyclopedia
  const matchedDiseaseItem = SEED_100_CROP_DISEASES.find(
    (d) =>
      q.includes(d.disease.toLowerCase()) ||
      q.includes(d.scientificName.toLowerCase().split(' ')[0])
  );

  if (matchedDiseaseItem) {
    const doc = getDiseaseDocumentary(matchedDiseaseItem);

    if (q.includes('symptom') || q.includes('sign') || q.includes('identif')) {
      return {
        sender: 'assistant',
        modeLabel: 'Knowledge Retrieval & Demo Guidance',
        contextBadge: `${doc.diseaseName} (${matchedDiseaseItem.crop})`,
        sourceCitations: doc.referencesAndSources.slice(0, 2),
        text: `[Plant Pathology Reference: ${doc.diseaseName}]\n• Host Crop: ${matchedDiseaseItem.crop} (${matchedDiseaseItem.cropGroup})\n• Causal Pathogen: ${doc.causalOrganism} (${matchedDiseaseItem.pathogenType})\n• Primary Field Symptoms: ${doc.symptomsAndSigns}\n• Diagnostic Confirmation: ${doc.diagnosisAndIdentification}\n• Favourable Weather Trigger: ${doc.favourableConditions}`,
        suggestedLinks: [
          { label: 'View Full Disease Infographic', route: '/disease' },
          { label: 'Browse Crop Protection in Store', route: '/store' },
        ],
      };
    }

    if (
      q.includes('treat') ||
      q.includes('chemical') ||
      q.includes('biological') ||
      q.includes('control') ||
      q.includes('spray') ||
      q.includes('remed') ||
      q.includes('spread')
    ) {
      return {
        sender: 'assistant',
        modeLabel: 'Knowledge Retrieval & Demo Guidance',
        contextBadge: `${doc.diseaseName} — Treatment & IDM`,
        sourceCitations: doc.referencesAndSources.slice(0, 2),
        text: `[Integrated Management Protocol: ${doc.diseaseName}]\n• Immediate Control & Threshold: ${doc.controlAndTreatment}\n• Biological Control: ${doc.biologicalControl}\n• Chemical Control (Label-Guided): ${doc.chemicalControl}\n• Core IDM Strategy: ${doc.integratedDiseaseManagement}\n\nSafety Note: Always verify dosage and waiting period (PHI) on the official CIBRC product label or consult your local KVK officer.`,
        suggestedLinks: [
          { label: 'Browse Bio-Inputs & Fungicides in Store', route: '/store' },
          { label: 'Check Spray Weather Window', route: '/weather' },
        ],
      };
    }

    if (q.includes('resistant') || q.includes('variet') || q.includes('prevent') || q.includes('sowing')) {
      return {
        sender: 'assistant',
        modeLabel: 'Knowledge Retrieval & Demo Guidance',
        contextBadge: `${doc.diseaseName} — Prevention & Varieties`,
        sourceCitations: doc.referencesAndSources.slice(0, 2),
        text: `[Prevention & Host Resistance: ${doc.diseaseName}]\n• Recommended Resistant Varieties: ${doc.resistantVarieties}\n• Pre-Sowing & Cultural Prevention: ${doc.prevention}\n• Season of Occurrence: ${doc.seasonOfOccurrence}\n• Mode of Spread to Block: ${doc.modeOfTransmission}`,
        suggestedLinks: [
          { label: 'Browse Certified Seeds in Store', route: '/store' },
          { label: 'Plan Crop in Farm Digital Twin', route: '/farm' },
        ],
      };
    }

    return {
      sender: 'assistant',
      modeLabel: 'Knowledge Retrieval & Demo Guidance',
      contextBadge: `${doc.diseaseName} (#${doc.id})`,
      sourceCitations: doc.referencesAndSources.slice(0, 2),
      text: `[Plain-Language Overview: ${doc.diseaseName} in ${matchedDiseaseItem.crop}]\n• What It Is: ${doc.definition}\n• Causal Pathogen: ${doc.causalOrganism} (${matchedDiseaseItem.pathogenType})\n• How It Spreads: ${doc.modeOfTransmission}\n• Key Field Symptoms: ${doc.symptomsAndSigns}\n• Recommended IDM & Treatment: ${doc.integratedDiseaseManagement}\n• Resistant Varieties: ${doc.resistantVarieties}`,
      suggestedLinks: [
        { label: 'Explore 100 Crop Diseases', route: '/disease' },
        { label: 'Browse Crop Protection Store', route: '/store' },
      ],
    };
  }

  // Device status comes from the API, but this deployment has no physical hardware integration.
  if (q.includes('device') || q.includes('sensor node') || q.includes('gateway') || q.includes('heartbeat') || q.includes('telemetry')) {
    const farmDevices = activeFarm
      ? ctx.devices.filter((device) => device.farmId === activeFarm.id && device.status !== 'retired')
      : ctx.devices.filter((device) => device.status !== 'retired');
    const summary = farmDevices.length
      ? farmDevices.map((device) => `• ${device.name} (${device.type === 'sensor_node' ? 'sensor node' : 'LoRa gateway'}): API-derived status ${device.status.replace(/_/g, ' ')}${device.isDemoRecord ? ' — development demo record' : ' — account record'}; ${device.lastSeenAt ? `last heartbeat ${device.lastSeenAt}` : 'no authenticated heartbeat received'}`).join('\n')
      : '• No device records are registered for this farm yet.';
    return {
      sender: 'assistant',
      modeLabel: 'Device Registry · Rule-Based Guidance',
      contextBadge: activeFarm?.name || 'Farm devices',
      text: `[Devices & IoT status]\n${summary}\n\nStatus is derived by the AGRIPULSE API, but this development deployment is not connected to physical device firmware, a field gateway, or a production IoT trust service. A demo record or API heartbeat is not proof of a verified field installation. “No telemetry received yet” is not the same as a zero reading. Weather-provider estimates and farmer observations remain separate from physical telemetry.`,
      suggestedLinks: [
        { label: 'Open Devices & IoT', route: '/devices' },
        ...(farmDevices[0] ? [{ label: `View ${farmDevices[0].name}`, route: `/devices/${farmDevices[0].id}` }] : []),
      ],
    };
  }

  // 1. Farm check / "what should I check on my farm today?"
  if (
    q.includes('check on my farm') ||
    q.includes('my farm') ||
    q.includes('farm today') ||
    q.includes('status') ||
    q.includes('activity')
  ) {
    if (!activeFarm) {
      return {
        sender: 'assistant',
        modeLabel: 'Demo Rule-Based Guidance',
        text: 'You currently have no active farms saved in your AGRIPULSE records. Click "Go to Farm Management" below to register your first farm and plots so I can summarize your crops and field tasks.',
        suggestedLinks: [{ label: 'Go to Farm Management', route: '/farm' }],
      };
    }

    const cropSummary =
      farmCrops.length > 0
        ? farmCrops
            .map((c) => `${c.cropName} (${c.variety}) in ${c.plotName} [${c.growthStage} — ${c.healthStatus}]`)
            .join('; ')
        : 'No crop records registered on this farm yet';

    const latestMoistureObs = latestObs.find((o) => typeof o.soilMoisturePct === 'number');
    const moistureNote = latestMoistureObs
      ? `Last recorded soil moisture (${latestMoistureObs.sourceLabel}) was ${latestMoistureObs.soilMoisturePct}% in ${latestMoistureObs.plotName || 'your plot'}. (No live physical sensor is currently connected.)`
      : 'No soil moisture observation is saved yet for this farm.';

    const topTasks =
      pendingActivities.length > 0
        ? pendingActivities
            .slice(0, 3)
            .map((a) => `• ${a.title} (${a.scheduledDate}, Priority: ${a.priority})`)
            .join('\n')
        : '• No pending activities scheduled in your calendar.';

    return {
      sender: 'assistant',
      modeLabel: 'Demo Rule-Based Guidance',
      text: `[Demo Guidance from Your Saved Records]\nActive Farm: ${activeFarm.name} (${activeFarm.totalArea} ${activeFarm.areaUnit}, ${activeFarm.district}, ${activeFarm.state})\n\n1. Active Crops (${farmCrops.length}): ${cropSummary}\n2. Moisture & Field Record: ${moistureNote}\n3. Priority Tasks to Check Today:\n${topTasks}`,
      suggestedLinks: [
        { label: 'Open Farm Workspace', route: '/farm' },
        { label: 'View Dashboard Calendar', route: '/home' },
        { label: '100 Diseases Directory', route: '/disease' },
      ],
    };
  }

  // 2. Weather explanation / "explain today's weather for my crop"
  if (q.includes('weather') || q.includes('rain') || q.includes('temperature') || q.includes('forecast')) {
    const w = ctx.weather;
    const rainyDay = w.daily.find((d) => d.rainProbPct >= 50);
    const cropNames =
      farmCrops.length > 0
        ? farmCrops.map((c) => c.cropName).join(', ')
        : ctx.profile.preferences.defaultCrop || 'your crops';

    return {
      sender: 'assistant',
      modeLabel: 'Demo Rule-Based Guidance',
      text: `[${w.sourceType} for ${w.locationLabel}]\n• Current Condition: ${w.tempC}°C (${w.condition}), Humidity ${w.humidityPct}%, Wind ${w.windSpeedKmh} km/h, Today's Rain Probability ${w.rainProbabilityPct}%.\n• 7-Day Outlook for ${cropNames}: ${
        rainyDay
          ? `Notice that ${rainyDay.dayLabel} (${rainyDay.date}) shows a ${rainyDay.rainProbPct}% chance of rain and a forecast precipitation estimate of ~${rainyDay.expectedRainMm} mm with ${rainyDay.windKmh} km/h winds. Consider completing urgent scouting early, keeping plot drainage bunds open, and avoiding non-essential irrigation right before expected rain.`
          : 'Dry and stable conditions expected over the coming days—favorable for morning irrigation and field scouting.'
      }\n\nNote: This guidance is educational and based on the displayed ${w.sourceType.toLowerCase()}; always cross-check local IMD/KVK advisories.`,
      suggestedLinks: [
        { label: 'Open Weather Intelligence', route: '/weather' },
        { label: 'Manage Farm Irrigation Tasks', route: '/farm' },
      ],
    };
  }

  // 3. Yellow leaves / disease / symptoms
  if (
    q.includes('yellow') ||
    q.includes('leaf') ||
    q.includes('leaves') ||
    q.includes('disease') ||
    q.includes('symptom') ||
    q.includes('pest') ||
    q.includes('curl')
  ) {
    return {
      sender: 'assistant',
      modeLabel: 'Demo Rule-Based Guidance',
      text: `[Educational Crop Health Scouting Guide]\nWhen investigating yellow leaves (chlorosis) on your farm, check three clues first:\n1. Which leaves turned yellow first?\n   • Older bottom leaves (uniform pale yellow) → Often Nitrogen scarcity or waterlogged roots.\n   • Older bottom leaves (green veins, yellow between veins) → Often Magnesium deficiency (common in fruiting tomatoes).\n   • Youngest top leaves (interveinal yellowing or rusty spots) → Often Iron or Zinc lockup (such as Khaira in paddy when soil pH > 7.5).\n2. Check under the leaf with a 10x lens: Look for whiteflies, aphids, or mites that cause yellow stippling and leaf curl.\n3. Check root-zone moisture at 15 cm depth: Over-watering suffocates roots and causes yellowing just like drought.\n\nFor a crop-specific disease profile, explore the 100 Crop Diseases Encyclopedia and consult your local KVK officer before applying chemical sprays.`,
      suggestedLinks: [
        { label: 'Open 100 Crop Diseases Directory', route: '/disease' },
        { label: 'Read "Interveinal Chlorosis" in Dictionary', route: '/dictionary' },
        { label: 'Browse Sticky Traps & Micronutrients', route: '/store' },
      ],
    };
  }

  // 4. Soil pH / Dictionary terms
  if (q.includes('ph') || q.includes('dictionary') || q.includes('explain ') || q.includes('what is')) {
    const matchedDict = ctx.dictionary.find(
      (d) =>
        q.includes(d.term.toLowerCase()) ||
        (q.includes('ph') && d.id === 'dict-06') ||
        (q.includes('cri') && d.id === 'dict-18') ||
        (q.includes('ipm') && d.id === 'dict-30') ||
        (q.includes('tensiometer') && d.id === 'dict-50')
    );

    if (matchedDict) {
      return {
        sender: 'assistant',
        modeLabel: 'Demo Rule-Based Guidance',
        text: `[AGRIPULSE Dictionary: ${matchedDict.term} / ${matchedDict.hindiTerm || ''}]\n• Simple Definition: ${matchedDict.simpleDefinition}\n• Farmer-Friendly Explanation: ${matchedDict.farmerFriendlyExplanation}\n• Practical Farm Example: ${matchedDict.practicalExample}\n• Why It Matters: ${matchedDict.whyItMatters}`,
        suggestedLinks: [
          { label: 'Explore Agricultural Dictionary (52 Terms)', route: '/dictionary' },
          { label: 'Browse Soil Testing Kits in Store', route: '/store' },
        ],
      };
    }
  }

  // 5. Government schemes
  if (q.includes('scheme') || q.includes('subsidy') || q.includes('pm-kisan') || q.includes('insurance') || q.includes('government')) {
    const state = ctx.profile.state || 'Haryana';
    const matchingSchemes = ctx.schemes.filter(
      (s) => s.applicability === 'National (All India)' || s.applicableStates.includes(state)
    );
    const listText = matchingSchemes
      .slice(0, 4)
      .map((s) => `• ${s.shortCode} (${s.category}): ${s.shortExplanation}`)
      .join('\n');

    return {
      sender: 'assistant',
      modeLabel: 'Demo Rule-Based Guidance',
      text: `[Demo Scheme Discovery for ${state}]\nHere are potentially relevant schemes from our sample directory (${matchingSchemes.length} found):\n${listText}\n\nImportant: AGRIPULSE provides educational discovery only and does not issue official eligibility approvals. Please use the Eligibility Finder on the Schemes page and verify deadlines on the official ".gov.in" portals.`,
      suggestedLinks: [{ label: 'Open Government Schemes & Eligibility Finder', route: '/schemes' }],
    };
  }

  // 6. Store products / "show me products for my selected crop"
  if (
    q.includes('product') ||
    q.includes('store') ||
    q.includes('buy') ||
    q.includes('seed') ||
    q.includes('fertilizer') ||
    q.includes('selected crop') ||
    q.includes('shop')
  ) {
    const preferredCrop =
      farmCrops[0]?.cropName || ctx.profile.preferences.defaultCrop || 'Wheat';
    const matchingProducts = ctx.products.filter((p) =>
      p.compatibleCrops.some((c) =>
        preferredCrop.toLowerCase().includes(c.toLowerCase()) ||
        c.toLowerCase().includes(preferredCrop.toLowerCase().split(' ')[0])
      )
    );
    const topProducts = (matchingProducts.length > 0 ? matchingProducts : ctx.products).slice(0, 4);
    const prodText = topProducts
      .map((p) => `• ${p.name} (${p.packSize}) — ${formatPaiseToINR(p.pricePaise)} [${p.category}]`)
      .join('\n');

    return {
      sender: 'assistant',
      modeLabel: 'Demo Rule-Based Guidance',
      text: `[Demo Store Recommendations for ${preferredCrop}]\nHere are matching agricultural supplies from the AGRIPULSE Store catalog:\n${prodText}\n\nYou can inspect individual product details, compare specifications, and complete simulated checkout with demo vouchers.`,
      suggestedLinks: [
        { label: 'Browse Agricultural Store', route: '/store' },
        { label: 'View Shopping Cart', route: '/cart' },
      ],
    };
  }

  // 7. Warranty & Quality Assurance question
  if (q.includes('warranty') || q.includes('guarantee') || q.includes('service') || q.includes('replacement')) {
    return {
      sender: 'assistant',
      modeLabel: 'Demo Rule-Based Guidance',
      text: `[AGRIPULSE sample product policy overview]\nProduct warranty, certification, germination, compliance, and return-policy details in this catalog are illustrative only and are not verified or active guarantees. No seller support, product testing, or replacement service is connected in this prototype. Check official product labels and an authorized seller before making a purchase decision.`,
      suggestedLinks: [
        { label: 'Browse Agricultural Store', route: '/store' },
        { label: 'View Demo Order History', route: '/orders' },
      ],
    };
  }

  // 8. 100 Crop Diseases / Pathology questions
  if (q.includes('disease') || q.includes('pathology') || q.includes('blast') || q.includes('rust') || q.includes('blight') || q.includes('wilt') || q.includes('smut')) {
    return {
      sender: 'assistant',
      modeLabel: 'Demo Rule-Based Guidance',
      text: `[AGRIPULSE 100 Crop Diseases Directory]\nOur platform includes complete scientific profiles for 100 major crop diseases across Indian agriculture:\n• Cereals: Rice blast (#1), BLB (#2), Wheat stripe rust (#11), Loose smut (#13)\n• Pulses: Chickpea wilt (#31), Ascochyta blight (#32), Mungbean yellow mosaic (#39)\n• Vegetables: Tomato early blight (#66), Late blight (#67), Bacterial wilt (#68)\n• Oilseeds & Commercial: Mustard Alternaria (#52), Cotton leaf curl (#59), Sugarcane red rot (#61)\n• Fruits: Mango anthracnose (#91), Citrus canker (#94), Banana Fusarium wilt TR4 (#96)\n\nEach profile details causal pathogens, primary field symptoms, favorable weather conditions, and Integrated Disease Management (IDM) practices.`,
      suggestedLinks: [
        { label: 'Open 100 Crop Diseases Directory', route: '/disease' },
        { label: 'Search Pathology Profiles', route: '/disease' },
      ],
    };
  }

  // 9. Follow-up or general fallback using context
  return {
    sender: 'assistant',
    modeLabel: 'Demo Rule-Based Guidance',
    text: `[AGRIPULSE AI Farm Assistant]\nI received your question: "${userQuery}".\n\nBased on your registered profile (${ctx.profile.name}, ${ctx.profile.district}, ${ctx.profile.state}), you currently have ${ctx.farms.filter((f) => !f.isArchived).length} active farm(s), ${ctx.crops.length} crop record(s), and ${pendingActivities.length} pending farm activity item(s).\n\nTry asking me:\n• "What should I check on my farm today?"\n• "Explain today's weather for my crop."\n• "How do I investigate yellow leaves?"\n• "Explain the warranty of store products."\n• "Tell me about wheat stripe rust in the 100 diseases list."\n• "Help me find suitable agricultural schemes."\n• "Show me products for my selected crop."`,
    suggestedLinks: [
      { label: 'Dashboard Overview', route: '/home' },
      { label: '100 Diseases Directory', route: '/disease' },
      { label: 'Agricultural Store', route: '/store' },
    ],
  };
}
