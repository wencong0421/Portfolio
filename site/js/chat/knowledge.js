// Everything the recruiter assistant knows about Ivan.
//
// IMPORTANT: this file is shipped to every visitor's browser, so treat it as public.
// Only put information here that you are happy to publish on the open web.
//
// Fields set to null or [] are deliberately empty. The assistant says it doesn't know them
// rather than guessing. Fill them in to let it answer those questions.

export const PROFILE = {
  meta: {
    lastUpdated: "2026-10-24",
    sources: ["General CV (Oct 2026)", "LinkedIn profile", "Degree certificate", "17 course and professional certificates", "This portfolio"],
    // Public file: no money amounts and no third-party system names. Keep it that way when editing.
  },

  identity: {
    fullName: "Wong Man Chong Ivan",
    preferredName: "Ivan",
    pronounHint: null, // e.g. "he/him". Left empty: the assistant refers to Ivan by name.
    headline: "Business Analyst | Data Engineering, BI & Cloud Automation",
    location: { city: "Johor Bahru", country: "Malaysia" },
    languages: [
      { name: "English", level: "Proficient" },
      { name: "Mandarin", level: "Native / bilingual" },
      { name: "Cantonese", level: "Native / bilingual" },
      { name: "Malay", level: "Proficient" },
    ],
  },

  contact: {
    email: "wencong0421@gmail.com",
    phone: "+60 16-346 7606",
    whatsapp: "https://wa.me/60163467606",
    linkedin: "https://www.linkedin.com/in/wongmanchongivan/",
    resume: "assets/Ivan_Wong_Resume.pdf",
  },

  summary:
    "Business Analyst and de facto data engineer who owns a multi-country retail group's data platform end to end, from Azure " +
    "data ingestion and SQL warehousing to the governed Power BI reporting leadership reviews every morning. Ivan took over a " +
    "vendor-built platform with no prior Azure experience and now runs its pipelines, semantic models, access security and cost " +
    "governance. Business Analytics graduate (dual award, Sunway University and Lancaster University; Second Class Honours, " +
    "Division One) with Microsoft Business Analyst and Google Business Intelligence professional certificates.",

  // Professional focus areas.
  focus: {
    areas: ["Data analytics", "Business intelligence (BI)", "Data engineering"],
    statement: "Data people can trust: governed models, reliable pipelines, and automation that removes manual work.",
  },

  // Fill these in if you want the assistant to answer them. Keep anything private out.
  workPreferences: {
    relocation: null, // e.g. "Open to relocation"
    workMode: null, // e.g. "On-site, hybrid or remote"
    noticePeriod: null, // e.g. "One month"
    availableFrom: null, // e.g. "January 2027"
    salaryExpectation: null, // usually best left empty and discussed directly
    workAuthorization: null, // e.g. "Malaysian citizen"
  },

  personal: {
    hobbies: [], // e.g. ["Badminton", "Photography"]
    interests: [], // e.g. ["Data visualisation", "AI tooling"]
    funFacts: [],
  },

  experience: [
    {
      id: "lavender-ba",
      company: "Lavender Confectionery & Bakery",
      companyAliases: ["lavender", "lavender confectionery", "lavender bakery"],
      role: "Business Analyst",
      type: "Full-time",
      start: "2026-04",
      end: null,
      location: "Johor Bahru, Malaysia",
      summary:
        "Sole in-house owner of the company's data platform since the original vendor's exit, covering Malaysia and Singapore outlets.",
      highlights: [
        "Owns the Power BI semantic models (sales, disposal, forecast, manufacturing and inventory) and the Azure stack behind them: Azure Functions, ADLS Gen2, Synapse dedicated and serverless SQL, and 20+ daily pipelines that have leadership reporting ready before working hours.",
        "Restored the weekly forecast pipeline used by Operations, Production and Purchasing after a 3.5-week outage caused by Microsoft retiring a legacy SharePoint authentication method: migrated to certificate-based Microsoft Entra ID authentication and rebuilt and redeployed the Azure Function package via Cloud Shell.",
        "Fixed a 6-week silent Synapse pipeline failure (validated through a Git branch and PR review), recovered undocumented Function App source code into the platform's first Azure DevOps repository, and ended recurring API rate-limit failures by re-sequencing 14 extraction functions.",
        "Reconciled a ~2.5% revenue gap between Power BI and the point-of-sale system of record, traced to hard-coded category exclusions in a SQL script, and introduced a governed category-mapping standard.",
        "Led an Azure cost review with a phased plan to cut monthly platform cost by about 70%, retiring idle resources and holding cost-impacting changes for formal approval.",
        "Built governed Power BI reporting for 25+ outlets with TREATAS-based cross-domain filtering and Row-Level Security, and replaced a manual Excel report holding 863 formula errors with an auto-refreshing dashboard.",
        "Automated manual reporting with Python (72 historical forecast files consolidated into one governed dataset; weekly forecast and monthly closing-stock compilation) and Power Automate flows for supplier e-invoice intake and BA request ticketing.",
        "Built a loyalty-membership analytics capability from scratch: API extraction on Azure Functions, ADLS, Synapse serverless SQL, a Power BI semantic model and an 8-page dashboard.",
        "Built a custom, read-only local MCP server (Python) over the point-of-sale API so sales and stock questions can be analysed in plain language through Claude, and piloted natural-language querying of the Power BI model via MCP.",
        "Briefed the CEO on governance for agentic AI, and led colleagues in adopting AI tooling (MCP servers, connectors and plugins), including configuring the setup on their laptops.",
      ],
      skills: ["Power BI", "DAX", "Azure Synapse Analytics", "Azure Functions", "ADLS Gen2", "Microsoft Entra ID", "SQL / T-SQL", "Python", "Git", "Azure DevOps", "Azure Cloud Shell", "Row-Level Security", "Data governance", "SharePoint", "Google Colab"],
    },
    {
      id: "lavender-auditor",
      company: "Lavender Confectionery & Bakery",
      companyAliases: ["lavender", "lavender confectionery", "lavender bakery", "auditor", "outlet auditor", "retail auditor", "audit role", "auditing"],
      role: "Outlet Retail Auditor (Part-time)",
      type: "Part-time",
      start: "2026-07",
      end: "2026-10",
      location: "Johor Bahru region, Malaysia",
      summary: "Monthly outlet audits across the Johor Bahru region, alongside the Business Analyst role.",
      highlights: [
        "Audited outlets on a monthly cycle for SOP compliance, cash handling, sales transactions, petty cash and stock control.",
        "Took over full regional audit coverage after a colleague's resignation, keeping every Johor Bahru outlet on its monthly cycle.",
        "Flagged system-versus-physical stock discrepancies and cash-control variances for reconciliation, and documented each audit with photographic evidence.",
      ],
      skills: ["Auditing", "SOP compliance", "Inventory control", "Reporting"],
    },
    {
      id: "rimbun",
      company: "Rimbun Capital",
      companyAliases: ["rimbun", "rimbun capital"],
      role: "Technical Business Analyst (Intern)",
      type: "Internship",
      start: "2026-01",
      end: "2026-03",
      location: "Kuala Lumpur, Malaysia",
      summary: "Led a centralised Asset Portfolio System and prototyped GenAI and OCR tools.",
      highlights: [
        "Spearheaded a centralised Asset Portfolio System to track high-value company assets, designing the backend schema in Dataverse.",
        "Primary liaison between senior stakeholders and the technical team, translating operational needs into Business Requirement Documents (BRDs).",
        "Developed interactive Power BI dashboards for asset valuation, status and location, helping management identify underperforming assets.",
        "Prototyped a GenAI Legal Assistant (ChatGPT Enterprise) for Corporate Recovery documents, and built an OCR pipeline (AI Builder + Power Automate) that extracts balance-sheet figures from SSM PDF filings.",
      ],
      skills: ["Dataverse", "Power BI", "BRDs", "Stakeholder management", "AI Builder", "Power Automate", "ChatGPT Enterprise", "Prompt engineering"],
    },
  ],

  education: [
    {
      id: "degree",
      institution: "Sunway University & Lancaster University (Dual Award)",
      institutionAliases: ["sunway university", "lancaster", "lancaster university", "sunway"],
      qualification: "Bachelor of Business Analytics (Honours)",
      classification: "Second Class Honours (Division One)",
      start: "2024-04",
      end: "2026-04",
      conferred: "2026-06-08",
      cgpa: "3.21 / 4.00",
      honours: ["Dean's List, September 2024 semester"],
      finalYearProject: "Alford, a web-based Power BI reporting system. Ivan built the full web application (HTML, CSS, JavaScript) and its Netlify deployment himself, and co-developed the Power BI reports with a teammate.",
    },
    {
      id: "diploma",
      institution: "Sunway College Johor Bahru",
      institutionAliases: ["sunway college", "sunway college johor bahru"],
      qualification: "Diploma in Business Administration",
      classification: null,
      start: "2022-03",
      end: "2024-03",
      cgpa: "3.00 / 4.00",
      honours: [],
    },
  ],

  projects: [
    {
      id: "recovery",
      number: 1,
      title: "Enterprise Data Platform Recovery",
      aliases: ["platform recovery", "outage", "forecast pipeline", "forecast outage", "entra migration", "authentication", "sharepoint auth", "production outage"],
      context: "Lavender Confectionery & Bakery",
      problem: "The automated weekly forecast pipeline used by Operations, Production and Purchasing went down for about 3.5 weeks after Microsoft retired a legacy SharePoint authentication method.",
      action: "Ivan root-caused it, migrated authentication to certificate-based Microsoft Entra ID, and personally redeployed the Azure Functions via Cloud Shell.",
      result: "Automated operations restored after roughly four weeks of manual fallback. It was a company-wide, C-suite-escalated incident.",
      tools: ["Azure Functions", "Microsoft Entra ID", "SharePoint", "Azure Cloud Shell"],
    },
    {
      id: "pipeline",
      number: 2,
      title: "Silent Pipeline Failure and Category Repair",
      aliases: ["silent failure", "pipeline failure", "category data", "category repair", "corrupted data", "synapse pipeline"],
      context: "Lavender Confectionery & Bakery",
      problem: "A Synapse pipeline had failed silently for six weeks, corrupting product-category data across the company.",
      action: "Ivan isolated the fix on its own Git branch, validated it through PR review, then released it to production.",
      result: "Data integrity restored across the full retail product catalogue.",
      tools: ["Azure Synapse Analytics", "SQL / T-SQL", "Git", "Azure DevOps"],
    },
    {
      id: "reconcile",
      number: 3,
      title: "Revenue Reconciliation: Power BI vs POS",
      aliases: ["reconciliation", "revenue reconciliation", "revenue gap", "discrepancy", "pos reconciliation", "sales gap", "2.5% gap"],
      context: "Lavender Confectionery & Bakery",
      problem: "Power BI was under-reporting revenue by about 2.5% against the point-of-sale system of record.",
      action: "Ivan traced the gap to hard-coded category exclusions in a SQL script, introduced a governed category-mapping standard, and set up a bill-and-item-level method for checking any future discrepancy.",
      result: "Numbers reconciled, with a standard that stops the gap returning.",
      tools: ["Power BI", "Azure SQL", "Data governance"],
    },
    {
      id: "rls",
      number: 4,
      title: "Multi-Branch DAX and Row-Level Security",
      aliases: ["rls", "row level security", "treatas", "multi branch", "branch filtering", "slicer", "branches"],
      context: "Lavender Confectionery & Bakery",
      problem: "Branch filtering and security had to behave consistently across 25+ branches even where fact and dimension coverage didn't match.",
      action: "Ivan built disconnected calculated tables and TREATAS-based cross-domain slicer logic for branch filtering and Row-Level Security.",
      result: "One governed model across 25+ branches, extended to a newly onboarded outlet.",
      tools: ["DAX", "TREATAS", "Row-Level Security", "Data modeling", "Power BI"],
    },
    {
      id: "automation",
      number: 5,
      title: "From Manual Reporting to Automation",
      aliases: ["automation", "72 files", "excel consolidation", "colab pipeline", "manual reporting", "data dictionary", "863 errors", "forecast files"],
      context: "Lavender Confectionery & Bakery",
      problem: "Quarterly forecast processing was fully manual, and a key Excel sales report held 863 cached formula errors.",
      action: "Ivan built a Python / Google Colab pipeline consolidating 72 historical forecast files (2024–2026, four formats) into one governed dataset for Synapse and Power BI, replaced the Excel report with an auto-refreshing dashboard, and wrote a 53-sheet data dictionary covering 45+ pipelines and 49 SQL tables.",
      result: "A fully manual quarterly workflow eliminated, and the platform documented from scratch.",
      tools: ["Python", "Pandas", "openpyxl", "Google Colab", "Power BI", "Azure Synapse Analytics"],
    },
    {
      id: "ocr",
      number: 6,
      title: "Asset Portfolio System and GenAI Tools",
      aliases: ["asset portfolio", "asset portfolio system", "legal assistant", "ssm filings", "rimbun project", "ocr pipeline"],
      context: "Rimbun Capital (internship)",
      problem: "High-value assets needed central tracking, and balance-sheet figures had to be pulled manually from SSM PDF filings.",
      action: "Ivan designed the Dataverse schema for a central asset tracker with Power BI dashboards on top, prototyped a ChatGPT Enterprise legal assistant for Corporate Recovery documents, and built an OCR pipeline (AI Builder + Power Automate).",
      result: "Management can spot underperforming assets, with less manual research and data entry.",
      tools: ["Dataverse", "Power BI", "AI Builder", "Power Automate", "ChatGPT Enterprise", "BRDs"],
    },
    {
      id: "loyalty",
      number: 7,
      title: "Loyalty Analytics, Built From Scratch",
      aliases: ["loyalty", "loyalty analytics", "membership analytics", "membership", "members", "crm analytics"],
      context: "Lavender Confectionery & Bakery",
      problem: "Marketing had membership data locked in a loyalty platform with no reporting.",
      action: "Ivan built the whole path: API extraction on Azure Functions (Flex Consumption) with Key Vault and managed identity, ADLS and Synapse serverless SQL, a Power BI semantic model and an 8-page dashboard, kept separate from the daily sales pipeline. He validated join keys against POS data and excluded a mis-keyed outlier and a test account before release.",
      result: "Member, tier and fraud-control insight refreshed every morning.",
      tools: ["Azure Functions", "Key Vault", "ADLS Gen2", "Synapse serverless SQL", "Power BI", "Python"],
    },
    {
      id: "cost",
      number: 8,
      title: "Azure Cost Review",
      aliases: ["cost review", "azure cost", "cloud cost", "cost reduction", "cost saving", "savings"],
      context: "Lavender Confectionery & Bakery",
      problem: "After the platform vendor left, nobody was watching cloud spend.",
      action: "Ivan reviewed every resource, retired an idle machine-learning workspace and unused pipelines, and planned SQL pool schedule and Function App plan changes, holding anything cost-impacting until it was formally approved.",
      result: "A phased plan to cut monthly platform cost by about 70%.",
      tools: ["Microsoft Azure", "Azure Synapse Analytics", "Azure Functions", "Cost governance"],
    },
    {
      id: "webapp",
      number: 9,
      title: "Alford: Web-Based Power BI Reporting System (Final Year Project)",
      aliases: ["final year project", "fyp", "alford", "web based", "reporting system", "website", "netlify project", "thesis"],
      context: "Sunway University (final year, Sep 2025 – Jan 2026)",
      problem: "Reporting needed to bring web-based data into Power BI and be reachable remotely.",
      action: "Ivan built the full web application (HTML, CSS, JavaScript) and deployed it on Netlify himself, and co-developed the Power BI reports with a teammate.",
      result: "Automated reporting that stakeholders can reach from any device.",
      tools: ["HTML", "CSS", "JavaScript", "Power BI", "Netlify", "Cursor"],
    },
    {
      id: "ezbot",
      number: 10,
      title: "EZBot Procurement Management System",
      aliases: ["ezbot", "procurement system", "purchase request", "goods receipt"],
      context: "Personal project (Dec 2025)",
      onPage: false, // CV only, no card on the page
      problem: "Purchase Request and Goods Received Note workflows needed one system with proper approvals.",
      action: "Ivan built a PHP and MySQL web system with role-based employee and manager access: PR and GRN submission with PO-linked items, urgency-based prioritisation, single and bulk approval, PDF purchase requests and ERP-ready CSV exports.",
      result: "Purchase requests and goods receipts raised, approved and exported in one place.",
      tools: ["PHP", "MySQL", "HTML", "CSS", "JavaScript"],
    },
  ],

  skills: [
    {
      category: "Cloud & data platform",
      items: [
        { name: "Azure Synapse Analytics", aliases: ["synapse", "azure synapse", "synapse analytics", "dedicated sql pool", "synapse pipelines"] },
        { name: "Azure Functions", aliases: ["azure functions", "azure function", "functions", "serverless"] },
        { name: "ADLS Gen2", aliases: ["adls", "adls gen2", "data lake", "azure data lake"] },
        { name: "Microsoft Entra ID", aliases: ["entra", "entra id", "azure ad", "azure active directory", "active directory"] },
        { name: "Azure Monitor", aliases: ["azure monitor", "monitoring"] },
        { name: "Azure DevOps", aliases: ["azure devops", "devops"] },
        { name: "Azure Cloud Shell", aliases: ["cloud shell", "azure cloud shell"] },
        { name: "Git", aliases: ["git", "github", "version control", "pull request", "pr review"] },
        { name: "Microsoft Azure", aliases: ["azure", "microsoft azure", "cloud"] },
      ],
    },
    {
      category: "Business intelligence",
      items: [
        { name: "Power BI", aliases: ["power bi", "powerbi", "pbi", "power bi desktop", "power bi service", "dashboards", "dashboard"] },
        { name: "DAX", aliases: ["dax"] },
        { name: "Power Query / M", aliases: ["power query", "m language", "m code"] },
        { name: "Row-Level Security", aliases: ["rls", "row level security", "row-level security"] },
        { name: "Data modeling", aliases: ["data modeling", "data modelling", "semantic model", "semantic layer", "star schema"] },
        { name: "Tableau", aliases: ["tableau"] },
      ],
    },
    {
      category: "Programming & automation",
      items: [
        { name: "SQL / T-SQL", aliases: ["sql", "t-sql", "tsql", "azure sql", "queries"] },
        { name: "Python", aliases: ["python", "pandas", "openpyxl"] },
        { name: "R", aliases: ["r", "r language", "rstudio"] },
        { name: "Google Colab", aliases: ["colab", "google colab", "jupyter", "notebooks"] },
        { name: "Excel (VBA, formula engineering)", aliases: ["excel", "vba", "spreadsheets", "macros"] },
        { name: "MySQL", aliases: ["mysql"] },
        { name: "HTML / CSS / JavaScript", aliases: ["html", "css", "javascript", "js", "web development", "front end", "frontend"] },
        { name: "PHP", aliases: ["php"] },
      ],
    },
    {
      category: "AI & automation",
      items: [
        { name: "Claude API / agentic AI architecture (evaluation)", aliases: ["claude", "claude api", "agentic", "agentic ai", "anthropic"] },
        { name: "Custom GPT agent development", aliases: ["custom gpt", "gpt", "chatgpt", "openai", "chatgpt enterprise"] },
        { name: "AI Builder (OCR & document extraction)", aliases: ["ai builder", "ocr", "document extraction"] },
        { name: "Prompt engineering", aliases: ["prompt engineering", "prompting", "prompts"] },
        { name: "Power Automate", aliases: ["power automate", "flows", "rpa", "workflow automation"] },
      ],
    },
    {
      category: "Collaboration & governance",
      items: [
        { name: "SharePoint", aliases: ["sharepoint"] },
        { name: "Microsoft Graph API", aliases: ["graph api", "microsoft graph"] },
        { name: "Microsoft Teams", aliases: ["teams", "microsoft teams"] },
        { name: "Power Apps", aliases: ["power apps", "powerapps"] },
        { name: "Power Pages", aliases: ["power pages"] },
        { name: "Dataverse", aliases: ["dataverse"] },
        { name: "Sage X3 ERP", aliases: ["sage", "sage x3", "erp"] },
        { name: "Data governance & documentation", aliases: ["data governance", "governance", "documentation", "data dictionary"] },
        { name: "Business process improvement", aliases: ["process improvement", "business process", "lean", "six sigma"] },
        { name: "Requirements (BRDs)", aliases: ["brd", "brds", "requirements", "requirements gathering", "business requirements"] },
      ],
    },
    {
      category: "Methods",
      items: [
        { name: "Statistical analysis", aliases: ["statistics", "statistical analysis", "stats"] },
        { name: "Machine learning", aliases: ["machine learning", "ml"] },
        { name: "Data transformation", aliases: ["data transformation", "etl", "elt", "data pipelines", "data cleaning"] },
        { name: "Time series analysis", aliases: ["time series", "forecasting"] },
        { name: "Agile / Scrum", aliases: ["agile", "scrum"] },
      ],
    },
  ],

  // Well-known tools Ivan has NOT listed, mapped to the closest thing he has used.
  // Lets the assistant answer "does he know X?" honestly instead of guessing.
  notListed: {
    snowflake: "Azure Synapse Analytics",
    databricks: "Azure Synapse Analytics",
    bigquery: "Azure Synapse Analytics",
    redshift: "Azure Synapse Analytics",
    "microsoft fabric": "Azure Synapse Analytics",
    fabric: "Azure Synapse Analytics",
    "data factory": "Azure Synapse Analytics",
    adf: "Azure Synapse Analytics",
    aws: "Microsoft Azure",
    gcp: "Microsoft Azure",
    "google cloud": "Microsoft Azure",
    looker: "Power BI",
    qlik: "Power BI",
    ssrs: "Power BI",
    ssis: "Azure Synapse Analytics",
    ssas: "Power BI",
    airflow: "Azure Synapse Analytics",
    dbt: "SQL / T-SQL",
    spark: "Python",
    pyspark: "Python",
    kafka: null,
    docker: null,
    kubernetes: null,
    terraform: null,
    java: null,
    "c#": null,
    react: "HTML / CSS / JavaScript",
    sap: "Sage X3 ERP",
    oracle: "SQL / T-SQL",
    postgresql: "SQL / T-SQL",
    postgres: "SQL / T-SQL",
    mongodb: null,
    salesforce: null,
    alteryx: "Python",
    sas: "R",
    spss: "R",
    matlab: "Python",
  },

  certifications: [
    { rank: 1, title: "Bachelor of Business Analytics, Second Class Honours (Division One)", issuer: "Sunway University (dual award with Lancaster University, BSc Business Analytics)", kind: "Honours degree", date: "8 June 2026", skills: ["Business analytics", "Statistics", "Machine learning"] },
    { rank: 2, title: "Microsoft Business Analyst", issuer: "Microsoft (via Coursera)", kind: "Professional Certificate", date: "24 Sep 2026", skills: ["Requirements gathering", "Process modeling (Visio)", "Power Platform", "Excel for BAs"], verify: "https://coursera.org/verify/professional-cert/WFA2LLOGW683", note: "A six-course Microsoft professional certificate delivered on Coursera. It is not a Microsoft certification exam such as PL-300." },
    { rank: 3, title: "Google Business Intelligence", issuer: "Google Career Certificates (via Coursera)", kind: "Professional Certificate", date: "28 Sep 2026", skills: ["Business intelligence", "Data models & pipelines", "Dashboards & reports"], verify: "https://coursera.org/verify/professional-cert/050INX1BQQM2" },
    { rank: 4, title: "Advanced Power BI: DAX Language, Formulas, and Calculations", issuer: "LinkedIn Learning", kind: "Course", date: null, skills: ["DAX", "Power BI"] },
    { rank: 5, title: "Advanced Power Query", issuer: "LinkedIn Learning", kind: "Course", date: null, skills: ["Power Query"] },
    { rank: 6, title: "Power BI Data Methods", issuer: "LinkedIn Learning (PMI® registered provider, 3.00 PDUs)", kind: "Course", date: null, skills: ["Power BI", "Data analysis"] },
    { rank: 7, title: "Time Series Modeling in Excel, R, and Power BI", issuer: "LinkedIn Learning", kind: "Course", date: null, skills: ["Time series", "R", "Power BI"] },
    { rank: 8, title: "Advanced Power BI Custom Visuals with d3.js", issuer: "LinkedIn Learning", kind: "Course", date: null, skills: ["D3.js", "Power BI"] },
    { rank: 9, title: "Excel for Business Analysts", issuer: "LinkedIn Learning (IIBA® endorsed, 2.50 CDUs)", kind: "Course", date: null, skills: ["Excel", "Business analysis"] },
    { rank: 10, title: "Business Analytics Foundations: Descriptive, Exploratory, and Explanatory Analytics", issuer: "LinkedIn Learning (IIBA® endorsed, 1.00 CDU)", kind: "Course", date: null, skills: ["Business analytics"] },
    { rank: 11, title: "Agile Business Analysis", issuer: "LinkedIn Learning (IIBA® endorsed, 2.00 CDUs)", kind: "Course", date: null, skills: ["Agile", "Business analysis"] },
    { rank: 12, title: "Data-Informed Strategic Thinking for Senior Analysts and Data Scientists", issuer: "LinkedIn Learning (IIBA® endorsed, 2.75 CDUs)", kind: "Course", date: null, skills: ["Data-driven decision making", "Strategic thinking"] },
    { rank: 13, title: "AI Strategy Foundations for Data Scientists and Team Leaders", issuer: "LinkedIn Learning (IIBA® endorsed, 1.00 CDU)", kind: "Course", date: null, skills: ["AI strategy", "AI for business analysis"] },
    { rank: 14, title: "Practical GitHub Project Management and Collaboration", issuer: "LinkedIn Learning (PMI® registered provider, 1.25 PDUs)", kind: "Course", date: null, skills: ["GitHub", "Project management"] },
    { rank: 15, title: "Agile Project Management: Continuous Improvement", issuer: "LinkedIn Learning (IIBA® endorsed, 1.00 CDU)", kind: "Course", date: null, skills: ["Agile project management", "Continuous improvement"] },
    { rank: 16, title: "Scrum: Advanced", issuer: "LinkedIn Learning (PMI® registered provider, 1.00 PDU)", kind: "Course", date: null, skills: ["Scrum"] },
    { rank: 17, title: "Lean Six Sigma Foundations", issuer: "LinkedIn Learning (PMI® registered provider, 1.25 PDUs)", kind: "Course", date: null, skills: ["Lean Six Sigma"] },
    { rank: 18, title: "Data-Driven Prospecting for Business Development", issuer: "LinkedIn Learning (PMI® registered provider, 0.50 PDU)", kind: "Course", date: null, skills: ["Business development"] },
  ],

  achievements: [
    "Resolved a company-wide, C-suite-escalated production outage by migrating to certificate-based Entra ID authentication and redeploying Azure Functions via Cloud Shell, ending ~4 weeks of manual fallback.",
    "Reconciled a ~2.5% revenue gap between Power BI and the point-of-sale system of record.",
    "Led an Azure cost review with a phased plan to cut monthly platform cost by about 70%.",
    "Built a loyalty-membership analytics capability end to end, from API extraction to an 8-page dashboard.",
    "Unified branch filtering and Row-Level Security across 25+ outlets.",
    "Consolidated 72 forecast files into one governed dataset; replaced a report with 863 formula errors.",
    "Built a custom read-only MCP server over the POS API and led colleagues in adopting AI tooling (MCP, connectors, plugins).",
    "Dean's List, September 2024 semester; degree conferred with Second Class Honours (Division One).",
  ],

  strengths: [
    { title: "Fixes production problems at the root", evidence: "Recovered a 3.5-week forecast outage and found a 6-week silent pipeline failure, then shipped tested fixes." },
    { title: "Cares about numbers being right", evidence: "Reconciled a ~2.5% revenue gap against the POS record and put a governed mapping standard in place so it can't recur." },
    { title: "Automates the manual work", evidence: "72 files into one dataset with Python; an 863-error Excel report replaced by an auto-refreshing dashboard." },
    { title: "Explains data to the business", evidence: "Briefed the CEO on governance for agentic AI, helped colleagues adopt AI tooling, and translated stakeholder needs into BRDs at Rimbun." },
    { title: "Learns fast", evidence: "Built a 53-sheet Azure governance data dictionary from zero prior cloud experience; 18 credentials, including Microsoft and Google professional certificates." },
  ],

  site: {
    stack: "A static site (HTML, CSS and JavaScript) deployed on Netlify, with Three.js and GSAP for the motion. This assistant runs entirely in your browser.",
  },
};
