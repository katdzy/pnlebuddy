/*
 * PNLE structure used everywhere in the app: tracker, quizzes, flashcards,
 * reviewers and the content importer.
 *
 * Papers follow the Enhanced Table of Specifications for the Nurse Licensure
 * Examination (Board of Nursing Res. No. 10, s. 2025, used from the November
 * 2025 exam onward). Fundamentals, pharmacology and PALMR (professional
 * practice: ethics, law, leadership, research, health teaching) are not
 * separate papers any more. They are tested inside every paper, mostly as
 * "Part B", so they live in their own "Integrated" group here.
 *
 * Each topic carries keywords. The importer uses them to sort questions and
 * flashcards into topics. Keep them specific: a generic word such as
 * "assessment" would pull in everything.
 *
 * This file must stay free of imports so the Node import scripts can load it.
 */

export type PaperId = "np1" | "np2" | "np3" | "np4" | "np5" | "int";

export interface Paper {
  id: PaperId;
  /** Short label shown in chips and tables, e.g. "NP3". */
  short: string;
  name: string;
  /** One line on what the paper covers. */
  summary: string;
}

export interface Area {
  id: string;
  paperId: PaperId;
  name: string;
}

export interface Topic {
  id: string;
  paperId: PaperId;
  areaId: string;
  name: string;
  keywords: string[];
}

export const PAPERS: Paper[] = [
  {
    id: "np1",
    short: "NP1",
    name: "Community Health Nursing",
    summary: "Care of individuals, families, population groups and the community.",
  },
  {
    id: "np2",
    short: "NP2",
    name: "Maternal & Child Health",
    summary: "Mother, newborn and child, from well clients to high-risk and sick.",
  },
  {
    id: "np3",
    short: "NP3",
    name: "Med-Surg A",
    summary: "Surgery, oxygenation, fluids & electrolytes, infection & immunity, cancer.",
  },
  {
    id: "np4",
    short: "NP4",
    name: "Med-Surg B",
    summary: "Nutrition & GI, metabolism & endocrine, perception & coordination.",
  },
  {
    id: "np5",
    short: "NP5",
    name: "Psych & Critical Care",
    summary: "Maladaptive patterns of behavior and life-threatening conditions.",
  },
  {
    id: "int",
    short: "All NPs",
    name: "Integrated in every paper",
    summary: "Fundamentals, pharmacology and PALMR. These appear inside all five papers.",
  },
];

export const AREAS: Area[] = [
  { id: "np1-system", paperId: "np1", name: "Public health & the health care system" },
  { id: "np1-family", paperId: "np1", name: "Family health nursing" },
  { id: "np1-community", paperId: "np1", name: "Community organizing & diagnosis" },
  { id: "np1-epi", paperId: "np1", name: "Epidemiology & health statistics" },
  { id: "np1-programs", paperId: "np1", name: "DOH programs" },
  { id: "np1-environment", paperId: "np1", name: "Environment & disaster" },

  { id: "np2-mother", paperId: "np2", name: "Mother: reproductive health & pregnancy" },
  { id: "np2-birth", paperId: "np2", name: "Mother: labor, postpartum & newborn" },
  { id: "np2-risk", paperId: "np2", name: "Mother: complications" },
  { id: "np2-growth", paperId: "np2", name: "Child: growth & development" },
  { id: "np2-sick-child", paperId: "np2", name: "Child: at-risk & sick" },

  { id: "np3-periop", paperId: "np3", name: "Surgery" },
  { id: "np3-oxygenation", paperId: "np3", name: "Oxygenation" },
  { id: "np3-fluids", paperId: "np3", name: "Fluids & electrolytes" },
  { id: "np3-infection", paperId: "np3", name: "Infectious, inflammatory & immunologic" },
  { id: "np3-cellular", paperId: "np3", name: "Cellular aberrations" },

  { id: "np4-gi", paperId: "np4", name: "Nutrition & gastrointestinal" },
  { id: "np4-endo", paperId: "np4", name: "Metabolism & endocrine" },
  { id: "np4-perception", paperId: "np4", name: "Perception & coordination" },

  { id: "np5-psych", paperId: "np5", name: "Maladaptive patterns of behavior" },
  { id: "np5-critical", paperId: "np5", name: "Life-threatening conditions" },

  { id: "int-fundamentals", paperId: "int", name: "Fundamentals of nursing" },
  { id: "int-pharma", paperId: "int", name: "Pharmacology" },
  { id: "int-palmr", paperId: "int", name: "Professional practice (PALMR)" },
];

export const TOPICS: Topic[] = [
  /* ── NP1 Community Health Nursing ─────────────────────────────────── */
  {
    id: "np1-phc-uhc",
    paperId: "np1",
    areaId: "np1-system",
    name: "Primary health care, UHC & levels of care",
    keywords: [
      "primary health care", "phc", "alma ata", "alma-ata", "universal health care", "uhc", "ra 11223",
      "philhealth", "health care delivery system", "levels of health care", "primary level of care",
      "secondary level", "tertiary level", "rural health unit", "rhu", "barangay health station", "bhs",
      "district hospital", "devolution", "local government code", "ra 7160", "sustainable development goals",
      "sdg", "millennium development goals", "referral system", "health care provider network",
      "elements of primary health care", "pillars of primary health care",
    ],
  },
  {
    id: "np1-chn-concepts",
    paperId: "np1",
    areaId: "np1-system",
    name: "CHN concepts, roles & public health laws",
    keywords: [
      "community health nursing", "community health nurse", "public health nursing", "public health nurse",
      "winslow", "public health", "magna carta of public health workers", "ra 7305", "code on sanitation",
      "pd 856", "roles of the community health nurse", "school health", "school nurse", "occupational health",
      "occupational health nurse", "health of the community", "community as client",
      "public health laws", "ra 9711", "ra 11332", "mandatory reporting of notifiable",
    ],
  },
  {
    id: "np1-family",
    paperId: "np1",
    areaId: "np1-family",
    name: "Family nursing process & home visit",
    keywords: [
      "family nursing process", "family health assessment", "family as a client", "first level assessment",
      "second level assessment", "health deficit", "health threat", "foreseeable crisis", "stress point",
      "typology of nursing problems", "genogram", "ecomap", "eco-map", "family-life chronology",
      "family life chronology", "home visit", "bag technique", "public health bag", "phn bag",
      "family coping index", "initial data base", "nuclear family", "extended family", "family structure",
      "family health tasks", "family developmental", "duvall", "family nursing care plan",
    ],
  },
  {
    id: "np1-copar",
    paperId: "np1",
    areaId: "np1-community",
    name: "Community organizing (COPAR)",
    keywords: [
      "copar", "community organizing", "community organization", "community organizer", "core group",
      "entry into the community", "entry phase", "integration phase", "social preparation", "people empowerment",
      "community participation", "pre-entry", "spot map", "community mobilization", "people's organization",
      "phase out", "community study",
    ],
  },
  {
    id: "np1-community-dx",
    paperId: "np1",
    areaId: "np1-community",
    name: "Community diagnosis & health program planning",
    keywords: [
      "community diagnosis", "comprehensive community diagnosis", "problem-oriented community diagnosis",
      "windshield survey", "ocular survey", "community assessment", "nature of the problem", "modifiability",
      "preventive potential", "salience", "health program planning", "program evaluation",
      "monitoring and evaluation", "community health planning", "health indicators", "community profile",
      "working with groups", "group dynamics",
    ],
  },
  {
    id: "np1-epidemiology",
    paperId: "np1",
    areaId: "np1-epi",
    name: "Epidemiology & surveillance",
    keywords: [
      "epidemiology", "epidemiologic", "epidemiological", "epidemiologic triad", "agent, host",
      "epidemic", "endemic", "pandemic", "sporadic", "outbreak", "outbreak investigation", "surveillance",
      "pidsr", "notifiable disease", "incidence rate", "prevalence rate", "attack rate",
      "natural history of disease", "case finding", "contact tracing", "herd immunity", "cohort study",
      "case-control", "epidemic curve",
    ],
  },
  {
    id: "np1-vital-stats",
    paperId: "np1",
    areaId: "np1-epi",
    name: "Vital statistics, demography & FHSIS",
    keywords: [
      "crude birth rate", "crude death rate", "infant mortality rate", "maternal mortality rate",
      "case fatality rate", "proportionate mortality", "proportional mortality", "specific death rate",
      "dependency ratio", "population pyramid", "demography", "demographic", "census", "vital statistics",
      "fhsis", "field health service information system", "target client list", "sex ratio",
      "fertility rate", "morbidity rate", "mortality rate", "population density", "civil registration",
      "neonatal mortality rate", "under-five mortality",
    ],
  },
  {
    id: "np1-epi-program",
    paperId: "np1",
    areaId: "np1-programs",
    name: "Expanded Program on Immunization",
    keywords: [
      "expanded program on immunization", "epi", "immunization", "vaccine", "vaccination", "bcg",
      "pentavalent", "opv", "ipv", "pcv", "mmr vaccine", "measles vaccine", "hepatitis b vaccine",
      "cold chain", "fully immunized child", "tetanus toxoid", "td vaccine", "chikiting ligtas",
      "vaccine vial monitor", "rotavirus vaccine", "ra 10152", "mandatory infants and children health immunization",
      "routine immunization", "booster dose",
    ],
  },
  {
    id: "np1-imci",
    paperId: "np1",
    areaId: "np1-programs",
    name: "IMCI",
    keywords: [
      "imci", "integrated management of childhood illness", "general danger signs", "chest indrawing",
      "fast breathing", "some dehydration", "severe dehydration", "plan a", "plan b", "plan c", "oresol",
      "oral rehydration", "ors", "severe pneumonia or very severe disease", "very severe febrile disease",
      "pink classification", "yellow classification", "green classification", "feeding problem",
      "ear problem", "mastoiditis",
    ],
  },
  {
    id: "np1-family-health-programs",
    paperId: "np1",
    areaId: "np1-programs",
    name: "Maternal, child & nutrition programs",
    keywords: [
      "safe motherhood", "maternal health program", "family planning program", "ra 10354",
      "responsible parenthood and reproductive health", "rpRH", "newborn screening act", "ra 9288",
      "milk code", "eo 51", "ra 10028", "expanded breastfeeding promotion", "operation timbang", "opt plus",
      "garantisadong pambata", "micronutrient supplementation", "vitamin a supplementation",
      "iron supplementation", "iodized salt", "asin law", "ra 8172", "food fortification", "sangkap pinoy",
      "ra 8976", "first 1000 days", "ra 11148", "nutrition program", "pinggang pinoy", "kalusugan at nutrisyon",
      "national nutrition council", "kangaroo mother care program", "adolescent health program",
      "sentrong sigla", "botika ng barangay", "barangay health worker", "bhw",
    ],
  },
  {
    id: "np1-disease-programs",
    paperId: "np1",
    areaId: "np1-programs",
    name: "Disease control programs & herbal medicine",
    keywords: [
      "national tuberculosis program", "ntp", "tb dots", "dots", "national tb control", "leprosy control",
      "multidrug therapy", "mdt", "dengue control", "4s strategy", "anti-rabies act", "ra 9482",
      "malaria control", "schistosomiasis control", "filariasis elimination", "mass drug administration",
      "ra 11166", "philippine hiv and aids policy", "herbal medicine", "traditional and alternative medicine",
      "ra 8423", "lagundi", "sambong", "tsaang gubat", "akapulko", "ampalaya", "bawang", "bayabas", "guava leaves",
      "yerba buena", "niyog-niyogan", "ulasimang bato", "pansit-pansitan", "non-communicable disease program",
      "healthy lifestyle", "philpen", "who pen", "mental health program", "oral health program",
    ],
  },
  {
    id: "np1-env-sanitation",
    paperId: "np1",
    areaId: "np1-environment",
    name: "Environmental sanitation",
    keywords: [
      "environmental sanitation", "environmental health", "safe water", "level i water", "level ii water",
      "level iii water", "water supply", "sanitary toilet", "excreta disposal", "solid waste", "ra 9003",
      "ecological solid waste", "vector control", "food sanitation", "food handler", "clean air act",
      "ra 8749", "sanitary permit", "health certificate", "pollution", "waste segregation", "chlorination",
    ],
  },
  {
    id: "np1-disaster",
    paperId: "np1",
    areaId: "np1-environment",
    name: "Disaster nursing & preparedness",
    keywords: [
      "disaster", "disaster nursing", "ra 10121", "ndrrmc", "disaster risk reduction", "mass casualty",
      "mass casualty incident", "start triage", "emergency preparedness", "evacuation", "evacuation center",
      "hazard", "vulnerability", "mitigation", "preparedness phase", "response phase", "recovery phase",
      "rehabilitation phase", "phases of disaster", "greenhouse", "climate change", "typhoon", "earthquake",
      "flood", "el nino", "psychological first aid", "bioterrorism", "chemical terrorism", "radiological",
    ],
  },

  /* ── NP2 Maternal & Child ─────────────────────────────────────────── */
  {
    id: "np2-repro",
    paperId: "np2",
    areaId: "np2-mother",
    name: "Reproductive health & the menstrual cycle",
    keywords: [
      "menstrual cycle", "menstruation", "ovulation", "ovarian cycle", "uterine cycle", "follicular phase",
      "luteal phase", "proliferative phase", "secretory phase", "fsh", "luteinizing hormone", "fertilization",
      "implantation", "spermatogenesis", "oogenesis", "gynecoid", "android pelvis", "anthropoid", "platypelloid",
      "diagonal conjugate", "true conjugate", "female reproductive", "male reproductive", "fallopian tube",
      "menarche", "menopause", "infertility", "dysmenorrhea", "amenorrhea", "premenstrual", "endometriosis",
      "reproductive health", "sexually transmitted",
    ],
  },
  {
    id: "np2-family-planning",
    paperId: "np2",
    areaId: "np2-mother",
    name: "Family planning methods",
    keywords: [
      "contraception", "contraceptive", "oral contraceptive", "birth control pill", "combined oral",
      "progestin-only", "iud", "intrauterine device", "condom", "dmpa", "injectable contraceptive",
      "subdermal implant", "tubal ligation", "bilateral tubal ligation", "vasectomy", "basal body temperature",
      "cervical mucus method", "billings", "lactational amenorrhea", "lam", "calendar method",
      "standard days method", "sympto-thermal", "coitus interruptus", "diaphragm", "natural family planning",
      "family planning method",
    ],
  },
  {
    id: "np2-pregnancy",
    paperId: "np2",
    areaId: "np2-mother",
    name: "Normal pregnancy & prenatal care",
    keywords: [
      "signs of pregnancy", "presumptive sign", "probable sign", "positive sign of pregnancy", "goodell",
      "chadwick", "hegar", "quickening", "ballottement", "naegele", "nagele", "aog", "age of gestation",
      "fundic height", "fundal height", "mcdonald", "leopold", "gravida", "gtpal", "tpal", "prenatal",
      "antepartum", "antepartal", "prenatal visit", "physiologic changes of pregnancy", "minor discomforts",
      "morning sickness", "pregnant client", "pregnant woman", "primigravida", "multigravida", "weeks gestation",
      "weeks' gestation", "weight gain in pregnancy", "hcg", "pregnancy test", "fetal development",
      "fetal circulation", "placenta", "amniotic fluid", "umbilical cord", "teratogen", "non-stress test",
      "nonstress test", "contraction stress test", "biophysical profile", "amniocentesis",
      "alpha-fetoprotein", "trimester", "kegel",
    ],
  },
  {
    id: "np2-labor",
    paperId: "np2",
    areaId: "np2-birth",
    name: "Labor & delivery",
    keywords: [
      "labor", "true labor", "false labor", "braxton hicks", "lightening", "bloody show", "stages of labor",
      "first stage of labor", "second stage of labor", "third stage of labor", "latent phase", "active phase",
      "transition phase", "cervical dilatation", "cervical dilation", "effacement", "fetal station", "engagement",
      "cardinal movements", "fetal presentation", "fetal position", "fetal lie", "fetal attitude",
      "uterine contractions", "fetal heart rate", "fhr", "early deceleration", "late deceleration",
      "variable deceleration", "episiotomy", "crowning", "ritgen", "placental separation", "schultze", "duncan",
      "fourth stage", "partograph", "epidural", "amniotomy", "induction of labor", "oxytocin", "pitocin",
      "bishop score", "intrapartum", "intrapartal", "laboring client", "in labor",
    ],
  },
  {
    id: "np2-postpartum",
    paperId: "np2",
    areaId: "np2-birth",
    name: "Postpartum care & breastfeeding",
    keywords: [
      "postpartum", "postpartal", "puerperium", "puerperal", "lochia", "lochia rubra", "lochia serosa",
      "lochia alba", "involution", "fundus after delivery", "afterpains", "rubin", "taking-in", "taking in phase",
      "taking-hold", "letting-go", "postpartum blues", "breastfeeding", "breast-feeding", "lactation", "colostrum",
      "latch", "breast engorgement", "rooming-in", "rooming in", "postnatal",
    ],
  },
  {
    id: "np2-newborn",
    paperId: "np2",
    areaId: "np2-birth",
    name: "Newborn care (EINC)",
    keywords: [
      "newborn", "neonate", "apgar", "einc", "essential intrapartum and newborn care", "unang yakap",
      "immediate drying", "skin-to-skin", "delayed cord clamping", "non-separation", "vitamin k injection",
      "eye prophylaxis", "erythromycin ointment", "crede", "newborn screening", "ballard", "caput succedaneum",
      "cephalhematoma", "cephalohematoma", "anterior fontanel", "posterior fontanel", "moro reflex",
      "rooting reflex", "sucking reflex", "physiologic jaundice", "vernix", "lanugo", "milia",
      "mongolian spot", "cold stress", "brown fat", "neonatal", "cord care",
    ],
  },
  {
    id: "np2-preg-complications",
    paperId: "np2",
    areaId: "np2-risk",
    name: "Complications of pregnancy",
    keywords: [
      "abortion", "spontaneous abortion", "threatened abortion", "inevitable abortion", "ectopic pregnancy",
      "hydatidiform mole", "h-mole", "molar pregnancy", "placenta previa", "abruptio placentae",
      "placental abruption", "incompetent cervix", "cervical insufficiency", "cerclage", "hyperemesis gravidarum",
      "preeclampsia", "pre-eclampsia", "pregnancy-induced hypertension", "gestational hypertension", "pih",
      "eclampsia", "hellp", "magnesium sulfate", "gestational diabetes", "gdm", "rh incompatibility",
      "rhogam", "rho(d) immune globulin", "anemia in pregnancy", "heart disease in pregnancy", "torch",
      "adolescent pregnancy", "multiple gestation", "twins", "polyhydramnios", "hydramnios", "oligohydramnios",
      "bleeding in pregnancy", "high-risk pregnancy",
    ],
  },
  {
    id: "np2-labor-complications",
    paperId: "np2",
    areaId: "np2-risk",
    name: "Labor & postpartum complications",
    keywords: [
      "preterm labor", "premature rupture of membranes", "prom", "pprom", "dystocia", "shoulder dystocia",
      "prolonged labor", "precipitate labor", "uterine rupture", "cord prolapse", "prolapsed cord",
      "amniotic fluid embolism", "breech", "cesarean", "caesarean", "c-section", "vbac", "postpartum hemorrhage",
      "pph", "uterine atony", "boggy uterus", "retained placenta", "subinvolution", "puerperal infection",
      "endometritis", "mastitis", "postpartum depression", "postpartum psychosis", "tocolytic", "terbutaline",
      "betamethasone", "forceps", "vacuum extraction", "post-term pregnancy", "dead fetus",
    ],
  },
  {
    id: "np2-gd-theories",
    paperId: "np2",
    areaId: "np2-growth",
    name: "Growth & development theories & milestones",
    keywords: [
      "erikson", "trust vs mistrust", "trust versus mistrust", "autonomy vs shame", "initiative vs guilt",
      "industry vs inferiority", "identity vs role confusion", "piaget", "sensorimotor", "preoperational",
      "concrete operational", "formal operational", "freud", "oral stage", "anal stage", "phallic stage",
      "latency stage", "genital stage", "kohlberg", "moral development", "developmental milestone", "milestone",
      "growth and development", "solitary play", "parallel play", "associative play", "cooperative play",
      "appropriate toy", "denver", "anticipatory guidance", "toddler", "preschooler", "preschool child",
      "school-age", "school age child", "adolescent", "object permanence", "separation anxiety",
      "stranger anxiety", "temper tantrum", "toilet training", "sibling rivalry", "puberty", "tanner",
      "infant's development", "months old", "month-old",
    ],
  },
  {
    id: "np2-well-child",
    paperId: "np2",
    areaId: "np2-growth",
    name: "Well-child care & the hospitalized child",
    keywords: [
      "well-child", "well child", "child safety", "childproofing", "accidental poisoning", "car seat",
      "weaning", "complementary feeding", "solid foods", "infant feeding", "infant formula", "teething",
      "dental care of the child", "hospitalized child", "hospitalized toddler", "preparing a child",
      "flacc", "faces pain scale", "therapeutic play", "play therapy", "pediatric client", "pediatric nursing",
      "child's parents", "parents of a child",
    ],
  },
  {
    id: "np2-high-risk-newborn",
    paperId: "np2",
    areaId: "np2-sick-child",
    name: "High-risk newborn",
    keywords: [
      "preterm infant", "premature infant", "prematurity", "low birth weight", "small for gestational age",
      "sga", "large for gestational age", "lga", "post-term infant", "respiratory distress syndrome",
      "surfactant", "hyaline membrane", "retinopathy of prematurity", "bronchopulmonary dysplasia",
      "necrotizing enterocolitis", "hyperbilirubinemia", "kernicterus", "phototherapy", "exchange transfusion",
      "erythroblastosis fetalis", "neonatal sepsis", "infant of a diabetic mother", "neonatal abstinence",
      "sudden infant death", "sids", "incubator", "isolette", "kangaroo mother care", "nicu",
    ],
  },
  {
    id: "np2-peds-resp-cardiac",
    paperId: "np2",
    areaId: "np2-sick-child",
    name: "Pediatric respiratory & cardiac",
    keywords: [
      "croup", "laryngotracheobronchitis", "epiglottitis", "bronchiolitis", "respiratory syncytial", "rsv",
      "childhood asthma", "cystic fibrosis", "tonsillitis", "tonsillectomy", "foreign body aspiration",
      "congenital heart", "tetralogy of fallot", "tet spell", "hypercyanotic", "ventricular septal defect",
      "atrial septal defect", "patent ductus arteriosus", "coarctation of the aorta", "transposition of the great",
      "rheumatic fever", "kawasaki", "acyanotic", "cyanotic heart", "squatting", "mist tent",
    ],
  },
  {
    id: "np2-peds-gi-gu",
    paperId: "np2",
    areaId: "np2-sick-child",
    name: "Pediatric GI, renal & metabolic",
    keywords: [
      "cleft lip", "cleft palate", "tracheoesophageal fistula", "esophageal atresia", "pyloric stenosis",
      "intussusception", "hirschsprung", "imperforate anus", "celiac", "gastroenteritis in children",
      "infant with diarrhea", "child with diarrhea", "nephrotic syndrome", "acute glomerulonephritis",
      "agn", "wilms", "nephroblastoma", "hypospadias", "epispadias", "cryptorchidism", "undescended testes",
      "vesicoureteral reflux", "phenylketonuria", "pku", "congenital hypothyroidism", "failure to thrive",
      "kwashiorkor", "marasmus", "type 1 diabetes in a child", "galactosemia", "g6pd",
    ],
  },
  {
    id: "np2-peds-neuro-msk",
    paperId: "np2",
    areaId: "np2-sick-child",
    name: "Pediatric neuro, MSK & senses",
    keywords: [
      "hydrocephalus", "spina bifida", "myelomeningocele", "meningocele", "neural tube defect",
      "cerebral palsy", "febrile seizure", "febrile convulsion", "reye syndrome", "reye's syndrome",
      "down syndrome", "trisomy 21", "autism", "autistic", "adhd", "attention deficit",
      "developmental dysplasia of the hip", "ddh", "ortolani", "barlow", "clubfoot", "talipes", "scoliosis",
      "duchenne", "muscular dystrophy", "legg-calve-perthes", "osteogenesis imperfecta", "strabismus",
      "amblyopia", "otitis media", "myringotomy", "lead poisoning", "pavlik harness", "bryant's traction",
      "intellectual disability", "craniosynostosis",
    ],
  },
  {
    id: "np2-peds-heme-onc-infx",
    paperId: "np2",
    areaId: "np2-sick-child",
    name: "Pediatric blood, cancer, skin & infections",
    keywords: [
      "sickle cell", "thalassemia", "hemophilia", "idiopathic thrombocytopenic purpura", "itp",
      "childhood leukemia", "acute lymphocytic leukemia", "acute lymphoblastic leukemia", "neuroblastoma",
      "retinoblastoma", "varicella", "chickenpox", "chicken pox", "rubeola", "koplik", "rubella",
      "german measles", "mumps", "pertussis", "whooping cough", "scarlet fever", "roseola",
      "hand, foot", "hand foot and mouth", "impetigo", "pediculosis", "head lice", "atopic dermatitis",
      "infantile eczema", "diaper rash", "diaper dermatitis", "childhood communicable",
    ],
  },

  /* ── NP3 Med-Surg A ──────────────────────────────────────────────── */
  {
    id: "np3-periop",
    paperId: "np3",
    areaId: "np3-periop",
    name: "Perioperative nursing",
    keywords: [
      "perioperative", "preoperative", "pre-operative", "intraoperative", "intra-operative", "postoperative",
      "post-operative", "operating room", "scrub nurse", "circulating nurse", "anesthesia", "general anesthesia",
      "spinal anesthesia", "regional anesthesia", "malignant hyperthermia", "sponge count", "instrument count",
      "time out", "surgical safety checklist", "wound dehiscence", "dehiscence", "evisceration", "pacu",
      "post-anesthesia", "aldrete", "sterile field", "surgical instruments", "autoclave", "trendelenburg",
      "lithotomy position", "surgical site infection", "surgical scrub", "surgery", "surgical client",
      "classification of surgery",
    ],
  },
  {
    id: "np3-respiratory",
    paperId: "np3",
    areaId: "np3-oxygenation",
    name: "Respiratory disorders",
    keywords: [
      "copd", "chronic obstructive pulmonary", "emphysema", "chronic bronchitis", "asthma", "pneumonia",
      "pulmonary embolism", "pneumothorax", "hemothorax", "chest tube", "chest drainage", "ctt", "water seal",
      "water-seal", "thoracentesis", "oxygen therapy", "nasal cannula", "venturi mask", "simple face mask",
      "non-rebreather", "nonrebreather", "incentive spirometer", "incentive spirometry", "pursed-lip",
      "pursed lip", "postural drainage", "chest physiotherapy", "bronchoscopy", "lung cancer",
      "respiratory failure", "sleep apnea", "pleural effusion", "empyema", "tracheostomy", "suctioning",
      "spirometry", "pulse oximetry", "sinusitis", "laryngeal cancer", "laryngectomy", "epistaxis",
      "respiratory system", "lungs", "breath sounds", "wheezing", "crackles", "dyspnea", "bronchodilator",
      "albuterol", "salbutamol", "theophylline", "aminophylline", "inhaler", "metered-dose",
    ],
  },
  {
    id: "np3-cardiovascular",
    paperId: "np3",
    areaId: "np3-oxygenation",
    name: "Cardiovascular disorders",
    keywords: [
      "coronary artery disease", "cad", "angina", "myocardial infarction", "heart failure",
      "congestive heart failure", "chf", "left-sided heart failure", "right-sided heart failure", "hypertension",
      "hypertensive", "antihypertensive", "atherosclerosis", "hyperlipidemia", "cholesterol", "endocarditis",
      "pericarditis", "myocarditis", "valvular", "mitral stenosis", "mitral regurgitation", "aortic stenosis",
      "cardiomyopathy", "peripheral arterial disease", "peripheral artery", "intermittent claudication",
      "raynaud", "buerger", "venous insufficiency", "varicose veins", "deep vein thrombosis", "dvt",
      "thrombophlebitis", "aneurysm", "aortic aneurysm", "ecg", "ekg", "electrocardiogram", "troponin",
      "ck-mb", "cardiac catheterization", "angioplasty", "pci", "cabg", "coronary artery bypass", "pacemaker",
      "digoxin", "digitalis", "nitroglycerin", "beta blocker", "beta-blocker", "ace inhibitor", "heparin",
      "warfarin", "coumadin", "anticoagulant", "inr", "aptt", "cardiac rehabilitation", "cardiovascular",
      "cardiac", "heart sounds", "chest pain",
    ],
  },
  {
    id: "np3-hematology",
    paperId: "np3",
    areaId: "np3-oxygenation",
    name: "Hematologic disorders",
    keywords: [
      "anemia", "iron deficiency anemia", "pernicious anemia", "vitamin b12", "aplastic anemia",
      "hemolytic anemia", "polycythemia", "leukopenia", "neutropenia", "thrombocytopenia", "blood transfusion",
      "transfusion reaction", "packed red blood cells", "prbc", "blood typing", "platelet count", "hemoglobin",
      "hematocrit", "bone marrow aspiration", "bone marrow biopsy", "splenectomy", "hematology", "hematologic",
      "myeloid", "lymphoid", "coagulation", "bleeding disorder", "ferrous sulfate", "iron supplement",
      "epoetin", "erythropoietin",
    ],
  },
  {
    id: "np3-fluids-electrolytes",
    paperId: "np3",
    areaId: "np3-fluids",
    name: "Fluids, electrolytes & acid-base",
    keywords: [
      "fluid volume deficit", "fluid volume excess", "dehydration", "hypovolemia", "hypervolemia", "isotonic",
      "hypotonic", "hypertonic", "iv fluid", "intravenous fluid", "d5w", "normal saline", "lactated ringer",
      "hyponatremia", "hypernatremia", "hypokalemia", "hyperkalemia", "hypocalcemia", "hypercalcemia",
      "trousseau", "chvostek", "hypomagnesemia", "hypermagnesemia", "hypophosphatemia", "hyperphosphatemia",
      "acid-base", "acid base", "metabolic acidosis", "metabolic alkalosis", "respiratory acidosis",
      "respiratory alkalosis", "arterial blood gas", "abg", "paco2", "hco3", "bicarbonate", "third spacing",
      "infiltration", "intake and output", "electrolyte", "electrolytes", "serum sodium", "serum potassium",
      "potassium chloride", "kcl",
    ],
  },
  {
    id: "np3-renal",
    paperId: "np3",
    areaId: "np3-fluids",
    name: "Renal & urinary disorders",
    keywords: [
      "acute kidney injury", "aki", "acute renal failure", "chronic kidney disease", "ckd",
      "chronic renal failure", "end-stage renal", "esrd", "dialysis", "hemodialysis", "peritoneal dialysis",
      "arteriovenous fistula", "av fistula", "kidney transplant", "renal transplant", "urinary tract infection",
      "uti", "pyelonephritis", "cystitis", "kidney stones", "urolithiasis", "renal calculi", "nephrolithiasis",
      "lithotripsy", "benign prostatic hyperplasia", "bph", "turp", "prostatectomy", "urinary retention",
      "urinary incontinence", "bladder cancer", "renal cell", "bun", "creatinine", "glomerular filtration",
      "urinalysis", "cystoscopy", "renal", "kidney", "urinary", "nephrotoxic", "diuretic", "furosemide",
      "spironolactone",
    ],
  },
  {
    id: "np3-communicable",
    paperId: "np3",
    areaId: "np3-infection",
    name: "Communicable diseases",
    keywords: [
      "communicable disease", "communicable", "infectious disease", "tuberculosis", "ptb", "pulmonary tb",
      "isoniazid", "rifampicin", "leprosy", "hansen", "dengue", "tourniquet test", "malaria", "rabies",
      "leptospirosis", "typhoid", "cholera", "amoebiasis", "amebiasis", "shigellosis", "bacillary dysentery",
      "hepatitis a", "hepatitis b", "poliomyelitis", "polio", "tetanus", "diphtheria", "meningococcemia",
      "meningococcal", "sars", "covid", "influenza", "avian", "filariasis", "schistosomiasis", "syphilis",
      "gonorrhea", "chlamydia", "genital herpes", "isolation precautions", "airborne precautions",
      "droplet precautions", "contact precautions", "standard precautions", "incubation period",
      "mode of transmission", "pathognomonic", "mrsa", "vre", "ebola", "anthrax", "scabies",
    ],
  },
  {
    id: "np3-immunology",
    paperId: "np3",
    areaId: "np3-infection",
    name: "Immunology & inflammation",
    keywords: [
      "immune system", "immunity", "active immunity", "passive immunity", "hypersensitivity", "allergy",
      "allergic", "latex allergy", "autoimmune", "systemic lupus", "lupus", "sle", "scleroderma",
      "systemic sclerosis", "sjogren", "sjögren", "hiv", "aids", "cd4", "viral load", "antiretroviral",
      "opportunistic infection", "pneumocystis", "kaposi", "transplant rejection", "graft rejection",
      "immunosuppressant", "immunosuppressed", "immunocompromised", "cyclosporine", "tacrolimus",
      "inflammatory response", "inflammation", "vasculitis", "immunology", "immunologic", "antibody",
      "antigen", "lymphocyte",
    ],
  },
  {
    id: "np3-oncology",
    paperId: "np3",
    areaId: "np3-cellular",
    name: "Oncology nursing",
    keywords: [
      "cancer", "oncology", "oncologic", "neoplasm", "malignant", "malignancy", "metastasis", "metastatic",
      "carcinogen", "warning signs of cancer", "caution", "tnm", "chemotherapy", "antineoplastic",
      "alkylating", "antimetabolite", "vincristine", "cisplatin", "methotrexate", "doxorubicin",
      "cyclophosphamide", "extravasation", "nadir", "myelosuppression", "bone marrow suppression",
      "neutropenic precautions", "radiation therapy", "radiotherapy", "brachytherapy", "external beam",
      "sealed radiation", "radiation implant", "mucositis", "stomatitis", "alopecia", "breast cancer",
      "mastectomy", "breast self-examination", "breast self-exam", "cervical cancer", "pap smear",
      "prostate cancer", "testicular cancer", "testicular self-exam", "leukemia", "lymphoma", "hodgkin",
      "multiple myeloma", "tumor lysis", "oncologic emergency", "palliative", "hospice", "tumor",
      "carcinoma", "sarcoma", "cellular aberration",
    ],
  },

  /* ── NP4 Med-Surg B ──────────────────────────────────────────────── */
  {
    id: "np4-nutrition",
    paperId: "np4",
    areaId: "np4-gi",
    name: "Nutrition & diet therapy",
    keywords: [
      "nutrition", "nutritional", "diet", "therapeutic diet", "low-sodium diet", "low sodium diet",
      "low-fat diet", "high-fiber", "high fiber", "clear liquid", "full liquid", "soft diet", "bland diet",
      "nutrients", "carbohydrate", "protein intake", "vitamin", "minerals", "body mass index", "bmi",
      "obesity", "enteral feeding", "tube feeding", "gastrostomy", "peg tube", "total parenteral nutrition",
      "tpn", "parenteral nutrition", "refeeding", "albumin", "prealbumin", "calorie", "kilocalorie",
      "food sources", "foods high in", "foods rich in", "dietary",
    ],
  },
  {
    id: "np4-upper-gi",
    paperId: "np4",
    areaId: "np4-gi",
    name: "Upper GI disorders",
    keywords: [
      "gerd", "gastroesophageal reflux", "hiatal hernia", "peptic ulcer", "gastric ulcer", "duodenal ulcer",
      "h. pylori", "helicobacter", "gastritis", "upper gi bleeding", "upper gastrointestinal bleeding",
      "hematemesis", "achalasia", "gastric cancer", "stomach cancer", "gastrectomy", "billroth",
      "dumping syndrome", "nasogastric", "ngt", "gastric lavage", "antacid", "proton pump inhibitor",
      "omeprazole", "pantoprazole", "ranitidine", "famotidine", "sucralfate", "barium swallow", "endoscopy",
      "egd", "esophagogastroduodenoscopy", "oral cancer", "dysphagia", "esophagus", "esophageal", "stomach",
      "gastric",
    ],
  },
  {
    id: "np4-lower-gi",
    paperId: "np4",
    areaId: "np4-gi",
    name: "Lower GI disorders",
    keywords: [
      "appendicitis", "appendectomy", "mcburney", "rovsing", "rebound tenderness", "peritonitis",
      "diverticulitis", "diverticulosis", "inflammatory bowel", "crohn", "ulcerative colitis",
      "irritable bowel", "bowel obstruction", "intestinal obstruction", "paralytic ileus", "ileus",
      "inguinal hernia", "umbilical hernia", "hemorrhoids", "colorectal cancer", "colon cancer", "colostomy",
      "ileostomy", "ostomy", "stoma", "colonoscopy", "barium enema", "sigmoidoscopy", "constipation",
      "diarrhea", "laxative", "fecal impaction", "malabsorption", "fecal occult blood", "stool for occult",
      "bowel", "intestinal", "colon", "rectal",
    ],
  },
  {
    id: "np4-hepatobiliary",
    paperId: "np4",
    areaId: "np4-gi",
    name: "Liver, gallbladder & pancreas",
    keywords: [
      "cirrhosis", "liver", "hepatic", "hepatitis", "hepatic encephalopathy", "asterixis", "ammonia",
      "lactulose", "ascites", "paracentesis", "esophageal varices", "varices", "sengstaken",
      "minnesota tube", "balloon tamponade", "portal hypertension", "liver biopsy", "jaundice",
      "cholecystitis", "cholelithiasis", "gallstones", "gallbladder", "cholecystectomy", "murphy",
      "t-tube", "pancreatitis", "cullen", "grey turner", "amylase", "lipase", "pancreatic cancer", "whipple",
      "ercp", "bilirubin", "pancreas",
    ],
  },
  {
    id: "np4-diabetes",
    paperId: "np4",
    areaId: "np4-endo",
    name: "Diabetes mellitus",
    keywords: [
      "diabetes mellitus", "diabetes", "diabetic", "type 1 diabetes", "type 2 diabetes", "insulin",
      "regular insulin", "nph", "insulin glargine", "lispro", "hypoglycemia", "hypoglycemic", "hyperglycemia",
      "diabetic ketoacidosis", "dka", "hhns", "hyperosmolar", "somogyi", "dawn phenomenon", "hba1c",
      "glycosylated hemoglobin", "oral hypoglycemic", "oral antidiabetic", "metformin", "sulfonylurea",
      "glipizide", "glyburide", "diabetic foot", "polyuria", "polydipsia", "polyphagia", "blood glucose",
      "capillary blood glucose", "fasting blood sugar", "fbs", "glucose tolerance",
    ],
  },
  {
    id: "np4-thyroid",
    paperId: "np4",
    areaId: "np4-endo",
    name: "Thyroid & parathyroid",
    keywords: [
      "thyroid", "hypothyroidism", "myxedema", "hyperthyroidism", "graves", "thyroid storm", "thyrotoxicosis",
      "exophthalmos", "goiter", "thyroidectomy", "levothyroxine", "synthroid", "propylthiouracil", "ptu",
      "methimazole", "lugol", "radioactive iodine", "t3", "t4", "tsh", "parathyroid", "hypoparathyroidism",
      "hyperparathyroidism", "parathyroid hormone", "pth",
    ],
  },
  {
    id: "np4-adrenal-pituitary",
    paperId: "np4",
    areaId: "np4-endo",
    name: "Adrenal, pituitary & endocrine basics",
    keywords: [
      "adrenal", "addison", "addisonian", "adrenal crisis", "cushing's syndrome", "cushing syndrome",
      "cushing's disease", "moon face", "buffalo hump", "pheochromocytoma", "hyperaldosteronism", "conn's",
      "corticosteroid", "glucocorticoid", "prednisone", "hydrocortisone", "pituitary", "hypophysectomy",
      "acromegaly", "gigantism", "dwarfism", "diabetes insipidus", "siadh", "antidiuretic hormone", "adh",
      "vasopressin", "desmopressin", "prolactin", "growth hormone", "hypothalamus", "master gland",
      "endocrine", "hormone", "hormones",
    ],
  },
  {
    id: "np4-neuro",
    paperId: "np4",
    areaId: "np4-perception",
    name: "Neurologic disorders",
    keywords: [
      "stroke", "cva", "cerebrovascular accident", "transient ischemic attack", "tia", "hemiplegia",
      "hemiparesis", "aphasia", "increased intracranial pressure", "intracranial pressure", "icp",
      "cushing's triad", "cushing triad", "head injury", "traumatic brain injury", "epidural hematoma",
      "subdural hematoma", "concussion", "glasgow coma scale", "gcs", "seizure", "epilepsy", "status epilepticus",
      "phenytoin", "dilantin", "meningitis", "encephalitis", "brain tumor", "craniotomy", "spinal cord injury",
      "autonomic dysreflexia", "quadriplegia", "tetraplegia", "paraplegia", "parkinson", "levodopa",
      "multiple sclerosis", "myasthenia gravis", "tensilon", "guillain-barre", "guillain-barré",
      "amyotrophic lateral sclerosis", "als", "huntington", "bell's palsy", "trigeminal neuralgia", "migraine",
      "cranial nerve", "lumbar puncture", "neurologic", "neurological", "pupils", "decerebrate", "decorticate",
      "romberg", "cerebellum", "cerebrum", "neuron", "neurotransmitter", "nervous system",
    ],
  },
  {
    id: "np4-senses",
    paperId: "np4",
    areaId: "np4-perception",
    name: "Eye & ear (special senses)",
    keywords: [
      "eye", "eyes", "cataract", "glaucoma", "intraocular pressure", "miotic", "pilocarpine", "timolol",
      "mydriatic", "retinal detachment", "macular degeneration", "conjunctivitis", "eye drops",
      "visual acuity", "snellen", "enucleation", "eye irrigation", "ear", "ears", "hearing loss",
      "conductive hearing", "sensorineural", "otosclerosis", "stapedectomy", "meniere", "ménière", "vertigo",
      "tinnitus", "otitis externa", "ear drops", "rinne", "weber test", "hearing aid", "presbycusis",
      "presbyopia", "ototoxic", "special senses", "vision", "visual", "blind",
    ],
  },
  {
    id: "np4-musculoskeletal",
    paperId: "np4",
    areaId: "np4-perception",
    name: "Musculoskeletal disorders",
    keywords: [
      "fracture", "cast", "traction", "buck's traction", "skeletal traction", "compartment syndrome",
      "fat embolism", "osteoporosis", "osteomyelitis", "osteoarthritis", "rheumatoid arthritis", "gout",
      "allopurinol", "colchicine", "hip replacement", "hip arthroplasty", "knee replacement", "amputation",
      "phantom limb", "prosthesis", "crutches", "crutch", "cane", "walker", "three-point gait", "sprain",
      "strain", "carpal tunnel", "low back pain", "herniated disk", "herniated disc", "herniated nucleus",
      "laminectomy", "osteosarcoma", "musculoskeletal", "orthopedic", "joint", "bone", "arthritis",
    ],
  },
  {
    id: "np4-integumentary",
    paperId: "np4",
    areaId: "np4-perception",
    name: "Skin & wound care",
    keywords: [
      "integumentary", "pressure ulcer", "pressure injury", "pressure sore", "decubitus", "braden scale",
      "wound care", "wound healing", "psoriasis", "dermatitis", "contact dermatitis", "acne", "herpes zoster",
      "shingles", "cellulitis", "skin cancer", "melanoma", "basal cell", "squamous cell", "pruritus",
      "skin lesion", "macule", "papule", "vesicle", "pustule", "debridement", "skin", "wound",
    ],
  },

  /* ── NP5 Psych & critical care ───────────────────────────────────── */
  {
    id: "np5-psych-concepts",
    paperId: "np5",
    areaId: "np5-psych",
    name: "Mental health concepts & therapeutic communication",
    keywords: [
      "mental health", "mental illness", "therapeutic communication", "therapeutic relationship",
      "nurse-client relationship", "nurse-patient relationship", "orientation phase", "working phase",
      "termination phase", "peplau", "transference", "countertransference", "defense mechanism", "denial",
      "projection", "displacement", "rationalization", "sublimation", "regression", "repression",
      "reaction formation", "introjection", "mental status examination", "milieu therapy", "group therapy",
      "behavior modification", "cognitive behavioral", "involuntary admission", "mental health act",
      "ra 11036", "seclusion", "self-awareness", "nontherapeutic", "non-therapeutic", "reflecting",
      "therapeutic response", "therapeutic", "psychiatry", "psychiatric nurse",
      "psychiatric unit",
    ],
  },
  {
    id: "np5-anxiety",
    paperId: "np5",
    areaId: "np5-psych",
    name: "Anxiety, OCD, trauma & somatic disorders",
    keywords: [
      "anxiety", "anxious", "panic disorder", "panic attack", "generalized anxiety", "phobia", "phobic",
      "obsessive-compulsive", "obsessive compulsive", "ocd", "ritualistic", "ptsd", "post-traumatic stress",
      "posttraumatic", "acute stress disorder", "conversion disorder", "somatic symptom", "somatoform",
      "hypochondriasis", "illness anxiety", "dissociative", "dissociative identity", "adjustment disorder",
      "benzodiazepine", "buspirone", "lorazepam", "diazepam", "alprazolam", "anxiolytic",
    ],
  },
  {
    id: "np5-mood",
    paperId: "np5",
    areaId: "np5-psych",
    name: "Mood disorders & suicide",
    keywords: [
      "depression", "depressed", "major depressive", "dysthymia", "persistent depressive", "bipolar", "mania",
      "manic", "hypomania", "suicide", "suicidal", "suicide precautions", "lithium", "lithium toxicity",
      "antidepressant", "ssri", "fluoxetine", "sertraline", "paroxetine", "tricyclic", "amitriptyline",
      "imipramine", "maoi", "monoamine oxidase", "tyramine", "phenelzine", "tranylcypromine",
      "electroconvulsive", "ect", "seasonal affective", "mood disorder", "mood stabilizer", "valproic",
    ],
  },
  {
    id: "np5-psychosis",
    paperId: "np5",
    areaId: "np5-psych",
    name: "Schizophrenia & psychotic disorders",
    keywords: [
      "schizophrenia", "schizophrenic", "psychosis", "psychotic", "hallucination", "hallucinating",
      "delusion", "delusional", "grandiose", "persecutory", "paranoid", "catatonic", "positive symptoms",
      "negative symptoms", "flat affect", "word salad", "clang association", "neologism", "echolalia",
      "loose association", "looseness of association", "antipsychotic", "haloperidol", "chlorpromazine",
      "clozapine", "risperidone", "olanzapine", "extrapyramidal", "eps", "tardive dyskinesia", "akathisia",
      "dystonia", "neuroleptic malignant", "agranulocytosis",
    ],
  },
  {
    id: "np5-personality-substance",
    paperId: "np5",
    areaId: "np5-psych",
    name: "Personality, substance use & eating disorders",
    keywords: [
      "personality disorder", "borderline", "antisocial", "narcissistic", "histrionic", "schizoid",
      "schizotypal", "avoidant personality", "dependent personality", "manipulative", "manipulation",
      "splitting", "substance abuse", "substance use", "alcohol", "alcoholism", "alcohol withdrawal",
      "delirium tremens", "wernicke", "korsakoff", "disulfiram", "antabuse", "naltrexone", "methadone",
      "opioid withdrawal", "shabu", "methamphetamine", "drug abuse", "drug dependence", "ra 9165",
      "dangerous drugs act", "cocaine", "marijuana", "cannabis", "eating disorder", "anorexia nervosa",
      "bulimia", "binge eating", "gender dysphoria", "addiction",
    ],
  },
  {
    id: "np5-cognitive-crisis",
    paperId: "np5",
    areaId: "np5-psych",
    name: "Cognitive disorders, crisis & abuse",
    keywords: [
      "dementia", "alzheimer", "delirium", "sundowning", "sundown", "confabulation", "cognitive disorder",
      "neurocognitive", "donepezil", "conduct disorder", "oppositional defiant", "crisis", "crisis intervention",
      "abuse", "child abuse", "elder abuse", "domestic violence", "intimate partner violence", "rape",
      "sexual assault", "battered", "violence", "violent", "aggression", "aggressive", "anger management",
      "de-escalation", "restraint", "geriatric", "older adult", "elderly", "aging",
    ],
  },
  {
    id: "np5-emergency",
    paperId: "np5",
    areaId: "np5-critical",
    name: "Emergency care, triage & poisoning",
    keywords: [
      "emergency department", "emergency room", "triage", "first aid", "basic life support", "bls",
      "cpr", "cardiopulmonary resuscitation", "chest compressions", "rescue breathing", "aed",
      "automated external defibrillator", "heimlich", "abdominal thrust", "choking", "airway obstruction",
      "primary survey", "poisoning", "overdose", "activated charcoal", "antidote", "snake bite", "snakebite",
      "heat stroke", "heatstroke", "hypothermia", "frostbite", "drowning", "near-drowning", "anaphylaxis",
      "anaphylactic", "epinephrine", "envenomation", "emergency nursing", "emergency", "golden hour",
    ],
  },
  {
    id: "np5-critical-care",
    paperId: "np5",
    areaId: "np5-critical",
    name: "Shock, sepsis & critical care",
    keywords: [
      "shock", "hypovolemic shock", "cardiogenic shock", "septic shock", "neurogenic shock", "sepsis",
      "septicemia", "sirs", "multiple organ dysfunction", "mods", "multisystem", "multi-organ",
      "disseminated intravascular coagulation", "dic", "vasopressor", "dopamine", "norepinephrine",
      "dobutamine", "central venous pressure", "cvp", "hemodynamic", "pulmonary artery catheter",
      "swan-ganz", "arterial line", "icu", "intensive care", "critical care", "critically ill", "ards",
      "acute respiratory distress syndrome", "mechanical ventilation", "mechanical ventilator", "ventilator",
      "peep", "endotracheal", "intubation", "intubated", "weaning", "cardiac arrest", "code blue", "acls",
      "ventricular fibrillation", "ventricular tachycardia", "asystole", "pulseless", "defibrillation",
      "defibrillate", "cardioversion", "dysrhythmia", "arrhythmia", "atrial fibrillation", "heart block",
      "cardiac tamponade", "beck's triad", "amiodarone", "lidocaine", "atropine", "adenosine",
    ],
  },
  {
    id: "np5-trauma-burns",
    paperId: "np5",
    areaId: "np5-critical",
    name: "Trauma & burns",
    keywords: [
      "burn", "burns", "burn injury", "rule of nines", "parkland", "fluid resuscitation", "eschar",
      "escharotomy", "partial-thickness", "partial thickness", "full-thickness", "full thickness",
      "superficial burn", "inhalation injury", "electrical burn", "chemical burn", "skin graft", "autograft",
      "trauma", "multiple trauma", "chest trauma", "flail chest", "abdominal trauma", "crush injury",
      "blunt trauma", "penetrating", "gunshot", "stab wound", "vehicular accident", "motor vehicle",
      "hemorrhage control",
    ],
  },

  /* ── Integrated: fundamentals, pharmacology, PALMR ────────────────── */
  {
    id: "int-nursing-process",
    paperId: "int",
    areaId: "int-fundamentals",
    name: "Nursing process & documentation",
    keywords: [
      "nursing process", "nursing diagnosis", "nanda", "nursing care plan", "expected outcome",
      "goal statement", "documentation", "charting", "soapie", "soap note", "focus charting", "dar",
      "pie charting", "kardex", "endorsement", "sbar", "critical thinking", "subjective data",
      "objective data", "cue", "inference", "validation", "nursing intervention", "independent nursing",
      "collaborative", "evaluation phase", "assessment phase", "planning phase", "implementation phase",
      "diagnosing phase",
    ],
  },
  {
    id: "int-health-assessment",
    paperId: "int",
    areaId: "int-fundamentals",
    name: "Health assessment, vital signs & lab values",
    keywords: [
      "vital signs", "temperature", "oral temperature", "rectal temperature", "axillary", "pulse",
      "radial pulse", "apical pulse", "pulse deficit", "respiratory rate", "blood pressure", "korotkoff",
      "physical examination", "physical assessment", "inspection", "palpation", "percussion", "auscultation",
      "health history", "lab values", "laboratory values", "normal value", "normal range", "pain assessment",
      "pain scale", "head-to-toe", "lung sounds", "bowel sounds", "specimen collection", "urine specimen",
      "24-hour urine", "stool specimen", "clean-catch", "health assessment",
    ],
  },
  {
    id: "int-basic-care",
    paperId: "int",
    areaId: "int-fundamentals",
    name: "Basic care, safety & comfort",
    keywords: [
      "hygiene", "bed bath", "oral care", "oral hygiene", "perineal care", "bed making", "positioning",
      "fowler", "semi-fowler", "sims", "prone", "supine", "body mechanics", "transfer", "range of motion",
      "rom exercises", "immobility", "fall prevention", "falls", "restraints", "client safety", "fire safety", "elimination", "urinary catheter", "indwelling catheter", "foley", "enema", "sleep pattern", "insomnia",
      "comfort measures", "heat application", "cold application", "death and dying", "postmortem", "post-mortem",
      "grief", "grieving", "kubler-ross", "kübler-ross", "stages of grief", "health belief model",
      "health-illness", "maslow", "hierarchy of needs", "levels of prevention", "primary prevention",
      "secondary prevention", "tertiary prevention", "stress and adaptation", "general adaptation syndrome",
      "selye", "homeostasis", "culture", "spiritual", "caring", "sick role",
    ],
  },
  {
    id: "int-infection-control",
    paperId: "int",
    areaId: "int-fundamentals",
    name: "Infection control & asepsis",
    keywords: [
      "chain of infection", "medical asepsis", "surgical asepsis", "hand hygiene", "handwashing",
      "hand washing", "sterile technique", "sterile gloves", "personal protective equipment", "ppe",
      "donning", "doffing", "nosocomial", "health care-associated", "healthcare-associated", "hai",
      "disinfection", "disinfectant", "sterilization", "sterile", "infection control", "infection prevention",
      "portal of entry", "portal of exit", "reservoir", "susceptible host",
    ],
  },
  {
    id: "int-theories",
    paperId: "int",
    areaId: "int-fundamentals",
    name: "Nursing theories & history",
    keywords: [
      "nightingale", "environmental theory", "henderson", "14 basic needs", "orem", "self-care deficit",
      "self care deficit", "roy", "adaptation model", "imogene king", "goal attainment", "neuman",
      "systems model", "dorothy johnson", "behavioral system", "watson", "theory of human caring", "leininger",
      "transcultural", "martha rogers", "unitary human beings", "abdellah", "levine", "conservation model",
      "benner", "novice to expert", "parse", "human becoming", "pender", "health promotion model",
      "theorist", "nursing theory", "metaparadigm", "history of nursing", "florence",
    ],
  },
  {
    id: "int-pharmacology",
    paperId: "int",
    areaId: "int-pharma",
    name: "Pharmacology & medication administration",
    keywords: [
      "medication administration", "rights of medication", "drug computation", "dosage calculation",
      "dose calculation", "flow rate", "drops per minute", "gtt", "mcgtt", "drip rate", "pharmacokinetics",
      "pharmacodynamics", "half-life", "side effect", "adverse effect", "toxicity", "therapeutic range",
      "peak and trough", "injection", "intramuscular", "subcutaneous", "intradermal", "z-track", "deltoid",
      "ventrogluteal", "vastus lateralis", "antibiotic", "aminoglycoside", "penicillin", "cephalosporin",
      "analgesic", "opioid", "morphine", "naloxone", "nsaid", "aspirin", "acetaminophen", "paracetamol",
      "drug classification", "generic name", "generics act", "ra 6675", "prescription", "pharmacology",
      "drug interaction", "drug toxicity", "medication error",
    ],
  },
  {
    id: "int-ethics-law",
    paperId: "int",
    areaId: "int-palmr",
    name: "Ethics, nursing law & jurisprudence",
    keywords: [
      "ethics", "ethical", "ethical principle", "autonomy", "beneficence", "nonmaleficence",
      "non-maleficence", "justice", "fidelity", "veracity", "confidentiality", "informed consent",
      "code of ethics", "ethical dilemma", "bioethics", "euthanasia", "do-not-resuscitate", "dnr",
      "advance directive", "malpractice", "negligence", "tort", "battery", "assault", "false imprisonment",
      "defamation", "slander", "libel", "invasion of privacy", "res ipsa loquitur", "respondeat superior",
      "good samaritan", "ra 9173", "philippine nursing act", "board of nursing", "prc", "licensure",
      "certificate of registration", "revocation", "suspension of license", "nursing law", "jurisprudence",
      "continuing professional development", "cpd", "ra 10912", "patient's rights", "patients' rights",
      "data privacy", "ra 10173", "liable", "liability", "legally", "legal responsibility",
    ],
  },
  {
    id: "int-leadership",
    paperId: "int",
    areaId: "int-palmr",
    name: "Leadership & management",
    keywords: [
      "leadership", "management theory", "nurse leader", "nurse manager", "management process", "head nurse", "autocratic",
      "democratic", "laissez-faire", "laissez faire", "transformational", "transactional", "situational leadership",
      "servant leadership", "delegation", "delegate", "supervision", "span of control", "organizational structure",
      "organizational chart", "chain of command", "unity of command", "centralized", "decentralized",
      "mission statement", "vision statement", "budget", "budgeting", "conflict resolution", "conflict management",
      "change theory", "lewin", "unfreezing", "refreezing", "change agent", "motivation theory", "herzberg",
      "mcgregor", "theory x", "theory y", "theory z", "fayol", "taylor", "scientific management", "weber",
      "bureaucracy", "time management", "decision making", "problem solving", "performance appraisal",
      "performance evaluation", "quality assurance", "quality improvement", "tqm", "total quality",
      "incident report", "risk management", "patient classification", "team nursing", "primary nursing",
      "functional nursing", "functional method", "case method", "total patient care", "case management",
      "staffing", "collective bargaining", "accountability", "swot", "gantt",
      "pert", "halo error", "leniency error", "recency error", "planning", "organizing", "directing", "controlling",
    ],
  },
  {
    id: "int-research",
    paperId: "int",
    areaId: "int-palmr",
    name: "Nursing research",
    keywords: [
      "research", "nursing research", "researcher", "research problem", "research question", "hypothesis",
      "null hypothesis", "variable", "independent variable", "dependent variable", "extraneous variable",
      "research design", "experimental", "quasi-experimental", "non-experimental", "descriptive study",
      "correlational", "qualitative", "quantitative", "phenomenology", "phenomenological", "grounded theory",
      "ethnography", "ethnographic", "historical research", "sampling", "probability sampling",
      "random sampling", "stratified", "cluster sampling", "systematic sampling", "convenience sampling",
      "purposive", "snowball", "quota sampling", "sample size", "respondents", "data collection",
      "questionnaire", "likert", "validity", "reliability", "pilot study", "statistics", "statistical",
      "median", "standard deviation", "t-test", "chi-square", "anova", "pearson", "correlation",
      "level of significance", "p value", "p-value", "type i error", "type ii error", "belmont",
      "literature review", "review of related literature", "conceptual framework", "theoretical framework",
      "abstract", "research proposal", "evidence-based", "evidence based",
    ],
  },
  {
    id: "int-health-education",
    paperId: "int",
    areaId: "int-palmr",
    name: "Health teaching & professional growth",
    keywords: [
      "health education", "health teaching", "teaching-learning", "teaching learning", "learning domain",
      "cognitive domain", "affective domain", "psychomotor domain", "adult learner", "andragogy", "pedagogy",
      "learning objectives", "return demonstration", "teaching plan", "readiness to learn", "client teaching",
      "discharge teaching", "professionalism", "professional organization", "philippine nurses association",
      "pna", "nursing profession", "roles of the nurse", "continuing education", "nursing informatics",
      "informatics", "telehealth", "collaboration", "teamwork", "interprofessional", "advocacy", "advocate",
      "career", "professional adjustment",
    ],
  },
];

/* ── Lookups ─────────────────────────────────────────────────────────── */

const topicById = new Map(TOPICS.map((t) => [t.id, t]));
const areaById = new Map(AREAS.map((a) => [a.id, a]));
const paperById = new Map(PAPERS.map((p) => [p.id, p]));

export function getTopic(id: string): Topic | undefined {
  return topicById.get(id);
}
export function getArea(id: string): Area | undefined {
  return areaById.get(id);
}
export function getPaper(id: string): Paper | undefined {
  return paperById.get(id as PaperId);
}
export function topicsInPaper(paperId: PaperId): Topic[] {
  return TOPICS.filter((t) => t.paperId === paperId);
}
export function areasInPaper(paperId: PaperId): Area[] {
  return AREAS.filter((a) => a.paperId === paperId);
}
export function topicsInArea(areaId: string): Topic[] {
  return TOPICS.filter((t) => t.areaId === areaId);
}
/** "NP3 · Respiratory disorders" */
export function topicLabel(id: string): string {
  const t = getTopic(id);
  if (!t) return "Older notes";
  return `${getPaper(t.paperId)?.short ?? ""} · ${t.name}`;
}
/** The exam's real papers, in order. Excludes the integrated group. */
export const EXAM_PAPERS = PAPERS.filter((p) => p.id !== "int");
