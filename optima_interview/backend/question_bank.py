"""
Topic areas and role lists per industry. Passed to Claude for question generation.
"""
from typing import List

INDUSTRY_TOPICS = {
    "Software Engineering": {
        "verbal_topics": [
            "Object-oriented programming principles (SOLID, encapsulation, inheritance, polymorphism)",
            "Data structures (arrays, linked lists, trees, hash maps, graphs)",
            "Algorithm complexity and Big-O notation",
            "System design fundamentals (scalability, load balancing, caching, databases)",
            "REST API design and HTTP fundamentals",
            "Version control and Git workflows",
            "Agile/Scrum development methodologies",
            "Testing strategies (unit, integration, end-to-end)",
            "Debugging approaches and problem-solving methodology",
            "Behavioral question: describe a challenging technical problem you solved",
        ],
        "code_topics": [
            "Write a function to reverse a string or array without built-in methods",
            "Implement a simple data structure (stack, queue, or linked list) in pseudocode or your preferred language",
        ],
        "has_technical": True,
    },
    "Data Science": {
        "verbal_topics": [
            "Supervised vs unsupervised learning — key differences and use cases",
            "Overfitting and underfitting — how to detect and prevent them",
            "Feature engineering and selection techniques",
            "Model evaluation metrics (precision, recall, F1, AUC-ROC)",
            "SQL for data analysis — joins, aggregations, window functions",
            "Statistics fundamentals (hypothesis testing, p-values, confidence intervals)",
            "Data cleaning and handling missing values",
            "A/B testing design and interpretation",
            "Explain a complex analysis result to a non-technical stakeholder",
            "Behavioral: describe a project where your analysis drove a business decision",
        ],
        "code_topics": [
            "Write a SQL query to find the top 5 customers by revenue from an orders table",
            "Write pseudocode for a function that computes the mean and standard deviation of a list",
        ],
        "has_technical": True,
    },
    "Finance": {
        "verbal_topics": [
            "DCF valuation — walk through the steps and key assumptions",
            "Financial statement analysis — how to assess a company's health from P&L, balance sheet, and cash flow",
            "Working capital and liquidity ratios",
            "WACC — what it is and how it's calculated",
            "M&A deal process and due diligence overview",
            "Risk management concepts (market risk, credit risk, operational risk)",
            "Accounting fundamentals — revenue recognition, accrual vs cash basis",
            "Capital markets — equity vs debt financing trade-offs",
            "Macroeconomic indicators and their impact on markets",
            "Behavioral: describe a time you had to make a decision with incomplete financial data",
        ],
        "code_topics": [
            "Calculate the NPV of a series of cash flows given a discount rate — write out the formula and compute manually with example numbers",
        ],
        "has_technical": True,
    },
    "Product Management": {
        "verbal_topics": [
            "How to prioritize features — frameworks like RICE, MoSCoW, or impact vs effort",
            "Defining and measuring product success — KPIs and metrics",
            "User research methods — when to use qualitative vs quantitative",
            "Writing a product requirements document (PRD) — key sections",
            "Stakeholder management and cross-functional collaboration",
            "Go-to-market strategy for a new product launch",
            "How you handle disagreements between engineering estimates and business deadlines",
            "Product roadmap planning and communication",
            "Competitive analysis techniques",
            "Behavioral: describe a product decision you made that didn't go as planned — what did you learn?",
        ],
        "code_topics": [],
        "has_technical": False,
    },
    "Marketing": {
        "verbal_topics": [
            "Building a marketing funnel — awareness to conversion to retention",
            "Paid vs organic acquisition channels — trade-offs and when to use each",
            "Brand positioning and differentiation strategy",
            "Content marketing strategy and measuring content ROI",
            "SEO fundamentals — on-page and off-page factors",
            "Email marketing best practices — segmentation, personalization, deliverability",
            "Social media strategy and platform selection",
            "Campaign performance analysis — key metrics (CAC, LTV, ROAS, CTR)",
            "A/B testing in marketing campaigns",
            "Behavioral: describe a campaign that exceeded or missed its targets and why",
        ],
        "code_topics": [],
        "has_technical": False,
    },
    "UX Design": {
        "verbal_topics": [
            "User-centered design process — discovery, define, ideate, prototype, test",
            "Conducting user interviews and usability tests",
            "Translating user research insights into design decisions",
            "Accessibility standards (WCAG) and inclusive design principles",
            "Information architecture and navigation patterns",
            "Design systems — benefits and how to maintain them",
            "Prototyping fidelity — when to use wireframes vs high-fidelity mocks",
            "Collaboration with product managers and developers",
            "How you handle design feedback and critique",
            "Behavioral: walk through a design challenge you faced and how you solved it",
        ],
        "code_topics": [],
        "has_technical": False,
    },
}

SUPPORTED_INDUSTRIES = list(INDUSTRY_TOPICS.keys())

# ── Job titles per industry (up to 10) ────────────────────────────────────────

INDUSTRY_ROLES = {
    "Software Engineering": [
        "Software Engineer",
        "Frontend Engineer",
        "Backend Engineer",
        "Full Stack Developer",
        "AI Engineer",
        "ML Engineer",
        "DevOps Engineer",
        "Mobile Developer",
        "Cloud Engineer",
        "Site Reliability Engineer",
    ],
    "Data Science": [
        "Data Scientist",
        "Data Analyst",
        "Business Intelligence Analyst",
        "ML Engineer",
        "Research Scientist",
        "Data Engineer",
        "Quantitative Analyst",
        "Analytics Engineer",
        "Data Architect",
        "Applied Scientist",
    ],
    "Finance": [
        "Financial Analyst",
        "Investment Banking Analyst",
        "Capital Markets Analyst",
        "Portfolio Manager",
        "Risk Analyst",
        "Corporate Finance Analyst",
        "Equity Research Analyst",
        "Treasury Analyst",
        "FP&A Analyst",
        "Quantitative Analyst",
    ],
    "Product Management": [
        "Product Manager",
        "Technical Product Manager",
        "Product Owner",
        "Associate Product Manager",
        "Growth Product Manager",
        "Platform Product Manager",
        "Mobile Product Manager",
        "Senior Product Manager",
        "Data Product Manager",
        "AI Product Manager",
    ],
    "Marketing": [
        "Marketing Manager",
        "Digital Marketing Manager",
        "Content Marketing Specialist",
        "Growth Marketing Manager",
        "Brand Manager",
        "Social Media Manager",
        "SEO Specialist",
        "Performance Marketing Manager",
        "Email Marketing Specialist",
        "Marketing Operations Manager",
    ],
    "UX Design": [
        "UX Designer",
        "UI Designer",
        "Product Designer",
        "UX Researcher",
        "Interaction Designer",
        "Visual Designer",
        "Design System Designer",
        "Service Designer",
        "Motion Designer",
        "Accessibility Designer",
    ],
}

# Roles that include 2 extra technical/code questions
TECHNICAL_ROLES = {
    # All Software Engineering
    "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Developer",
    "AI Engineer", "ML Engineer", "DevOps Engineer", "Mobile Developer",
    "Cloud Engineer", "Site Reliability Engineer",
    # Selected Data Science
    "Data Scientist", "Data Engineer", "Quantitative Analyst", "Applied Scientist",
    # Finance quant
    "FP&A Analyst",
}


def is_technical_role(job_title: str) -> bool:
    """Return True if this role should include technical/code questions."""
    return job_title in TECHNICAL_ROLES


def get_roles_for_industry(industry: str) -> List[str]:
    """Return the list of job titles for the given industry."""
    return INDUSTRY_ROLES.get(industry, [])


def get_industry_context(industry: str) -> dict:
    """Return topic guidance for a given industry. Falls back to generic topics."""
    return INDUSTRY_TOPICS.get(industry, {
        "verbal_topics": [
            "Your professional background and key strengths",
            "Describe a challenging project and how you handled it",
            "How you approach problem-solving under pressure",
            "Teamwork and collaboration experience",
            "How you stay current in your field",
            "A time you had to learn a new skill quickly",
            "How you handle constructive criticism",
            "Your approach to time management and prioritization",
            "A conflict with a colleague and how you resolved it",
            "Where you see yourself in five years",
        ],
        "code_topics": [],
        "has_technical": False,
    })
