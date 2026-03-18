/**
 * @file tips_library.js
 * @description Library of NGSS-aligned coaching tips for Science and Engineering Practices (SEPs) and Crosscutting Concepts (CCCs).
 * Extracted and adapted from:
 * - "Helping Students Make Sense of the World Using Next Generation Science and Engineering Practices" (NSTA)
 * - "Crosscutting Concepts: Strengthening Science and Engineering Learning" (Jeffrey Nordine & Okhee Lee)
 */

import { App } from './state.js';

export const SEPTipsLibrary = {
    'SEP1': {
        title: 'Asking Questions',
        icon: 'mdi:help-circle',
        elements: [
            {
                id: 'sep1_explanatory',
                label: 'Explanatory Questions',
                text: "Go beyond yes/no questions. Ask 'how' and 'why' questions that get at the mechanism of a phenomenon.",
                mindset: 'Seek Mechanisms'
            },
            {
                id: 'sep1_gaps',
                label: 'Identify Gaps',
                text: "Use questions to identify what still needs to be explained. What is the gap between what we know and what we see?",
                mindset: 'Embrace Uncertainty'
            },
            {
                id: 'sep1_testable',
                label: 'Testable Questions',
                text: "Specify variables that can be observed or measured. What kind of evidence would help you answer this?",
                mindset: 'Empirical Focus'
            },
            {
                id: 'sep1_clarify',
                label: 'Clarify Models',
                text: "Ask questions to clarify or refine a model, an explanation, or an engineering problem.",
                mindset: 'Precision'
            }
        ]
    },
    'SEP2': {
        title: 'Developing and Using Models',
        icon: 'mdi:cube-outline',
        elements: [
            {
                id: 'sep2_reasoning',
                label: 'Tools for Reasoning',
                text: "Models are tools for thinking, not just pictures. Use them to externalize and refine your ideas.",
                mindset: 'Active Sense-Making'
            },
            {
                id: 'sep2_predict',
                label: 'Predict and Explain',
                text: "Use your model to generate data that can be tested, or to explain a complex relationship.",
                mindset: 'Predictive Power'
            },
            {
                id: 'sep2_revise',
                label: 'Iterative Revision',
                text: "Models are never 'finished.' Revise your model as you encounter new evidence or contrasting ideas.",
                mindset: 'Continuous Improvement'
            },
            {
                id: 'sep2_limitations',
                label: 'Evaluate Limitations',
                text: "Consider what your model represents well and what it leaves out. All models have limitations.",
                mindset: 'Critical Analysis'
            }
        ]
    },
    'SEP3': {
        title: 'Planning and Carrying Out Investigations',
        icon: 'mdi:microscope',
        elements: [
            {
                id: 'sep3_purpose',
                label: 'Goal-Oriented',
                text: "Decide what kind of data or observations would help answer your specific question or test your model.",
                mindset: 'Purposeful Action'
            },
            {
                id: 'sep3_fair_test',
                label: 'Fair Testing',
                text: "In a controlled experiment, identify independent and dependent variables and keep others constant.",
                mindset: 'Control & Precision'
            },
            {
                id: 'sep3_systematic',
                label: 'Systematic Records',
                text: "Record your data in an organized way. How can we ensure our measurements are consistent and reliable?",
                mindset: 'Rigorous Methods'
            },
            {
                id: 'sep3_field_work',
                label: 'Field Observations',
                text: "Some investigations happen in the field. Observe naturally occurring trends and look for causal clues.",
                mindset: 'Real-World Context'
            }
        ]
    },
    'SEP4': {
        title: 'Analyzing and Interpreting Data',
        icon: 'mdi:chart-line',
        elements: [
            {
                id: 'sep4_patterns',
                label: 'Identify Patterns',
                text: "Look for trends, features, and relationships in your data. What story are the numbers telling?",
                mindset: 'Pattern Recognition'
            },
            {
                id: 'sep4_outliers',
                label: 'Manage Uncertainty',
                text: "Identify outliers or anomalies. Think about equipment error versus actual scientific variation.",
                mindset: 'Critical Evaluation'
            },
            {
                id: 'sep4_visualization',
                label: 'Visual Tools',
                text: "Use graphs, tables, and statistical summaries to make hidden relationships visible.",
                mindset: 'Visual Thinking'
            },
            {
                id: 'sep4_evidence',
                label: 'Data to Evidence',
                text: "Translate raw data into evidence that can be used to support a scientific claim or explanation.",
                mindset: 'Synthesis'
            }
        ]
    },
    'SEP5': {
        title: 'Using Math and Computational Thinking',
        icon: 'mdi:calculator',
        elements: [
            {
                id: 'sep5_quantify',
                label: 'Quantify Trends',
                text: "Move from qualitative patterns to quantitative specifications. How much? How fast? How many?",
                mindset: 'Precision'
            },
            {
                id: 'sep5_simulations',
                label: 'Use Simulations',
                text: "Use computer simulations to explore systems that are too complex, too fast, or too small to see.",
                mindset: 'Technological Leverage'
            },
            {
                id: 'sep5_variables',
                label: 'Define Variables',
                text: "Describe relationships between variables using mathematical symbols and equations.",
                mindset: 'Logical Modeling'
            }
        ]
    },
    'SEP6': {
        title: 'Constructing Explanations',
        icon: 'mdi:lightbulb-on',
        elements: [
            {
                id: 'sep6_mechanism',
                label: 'Causal Account',
                text: "Go beyond naming. Articulate a chain of events or a mechanism that explains why a phenomenon happens.",
                mindset: 'Causal Reasoning'
            },
            {
                id: 'sep6_fits_evidence',
                label: 'Fit to Evidence',
                text: "Your explanation must be consistent with all available data. If it doesn't fit, it must be revised.",
                mindset: 'Empirical Grounding'
            },
            {
                id: 'sep6_dci_link',
                label: 'Apply Core Ideas',
                text: "Link your specific observations to the big scientific principles (Core Ideas) you've been learning.",
                mindset: 'Theoretical Depth'
            }
        ]
    },
    'SEP7': {
        title: 'Engaging in Argument from Evidence',
        icon: 'mdi:forum',
        elements: [
            {
                id: 'sep7_justification',
                label: 'Provide Support',
                text: "Defend your reasoning with a combination of available evidence and disciplinary core ideas.",
                mindset: 'Evidence-Based'
            },
            {
                id: 'sep7_critique',
                label: 'Peer Critique',
                text: "Evaluate and critique the claims of others. Be 'hard on the ideas, but easy on the people.'",
                mindset: 'Constructive Dialogue'
            },
            {
                id: 'sep7_reconciliation',
                label: 'Seek Consensus',
                text: "Reconcile different claims. How can we move toward a shared understanding based on the best evidence?",
                mindset: 'Collaborative Growth'
            }
        ]
    },
    'SEP8': {
        title: 'Obtaining and Communicating Info',
        icon: 'mdi:share-variant',
        elements: [
            {
                id: 'sep8_credibility',
                label: 'Source Evaluation',
                text: "Evaluate the credibility of media sources. Is the information reliable, evidence-based, and unbiased?",
                mindset: 'Critical Consumer'
            },
            {
                id: 'sep8_multimodal',
                label: 'Multimodal Literacies',
                text: "Communicate using a mix of text, diagrams, and data displays to make your findings clear to any audience.",
                mindset: 'Effective Expression'
            },
            {
                id: 'sep8_synthesis',
                label: 'Synthesize Sources',
                text: "Combine information from multiple sources to develop a more robust scientific account.",
                mindset: 'Information Integration'
            }
        ]
    }
};

export const CCCTipsLibrary = {
    'cat_patterns': {
        title: 'Patterns',
        icon: 'mdi:chart-scatter-plot',
        elements: [
            {
                id: 'ccc_patterns_obs',
                label: 'Careful Observation',
                text: 'What do I notice after careful observation? Do any features or patterns emerge that are interesting?',
                mindset: 'Pattern Recognition'
            },
            {
                id: 'ccc_patterns_data',
                label: 'Data Relationships',
                text: 'What relationships do I see in the data? Are there correlations that suggest a deeper connection?',
                mindset: 'Relationship Mapping'
            }
        ]
    },
    'cat_causes': {
        title: 'Cause & Effect',
        icon: 'mdi:vector-difference-ba',
        elements: [
            {
                id: 'ccc_causes_mech',
                label: 'Causal Mechanism',
                text: 'Does it seem likely that some events or changes are causing others? What is the mechanism?',
                mindset: 'Causal Reasoning'
            },
            {
                id: 'ccc_causes_prediction',
                label: 'Predictive Logic',
                text: 'If I change one variable, what happens to the other? Can I predict the outcome based on a causal link?',
                mindset: 'Predictive Power'
            }
        ]
    },
    'cat_scale': {
        title: 'Scale, Proportion & Quantity',
        icon: 'mdi:ruler',
        elements: [
            {
                id: 'ccc_scale_measure',
                label: 'Quantification',
                text: 'What should be measured or quantified to better understand this? How do size and time affect the phenomenon?',
                mindset: 'Scale Analysis'
            },
            {
                id: 'ccc_scale_relevance',
                label: 'Scale Relevance',
                text: 'What is relevant at different measures of size or time? Does the system behave differently at a larger scale?',
                mindset: 'Proportional Thinking'
            }
        ]
    },
    'cat_systems': {
        title: 'Systems & Models',
        icon: 'mdi:graph',
        elements: [
            {
                id: 'ccc_systems_components',
                label: 'System Components',
                text: 'What are the components of the system under consideration? What are the boundaries?',
                mindset: 'Systems Thinking'
            },
            {
                id: 'ccc_systems_interactions',
                label: 'Interactions',
                text: 'How do the parts interact to carry out functions that individual parts cannot do alone?',
                mindset: 'Interdependency'
            }
        ]
    },
    'cat_energy': {
        title: 'Energy & Matter',
        icon: 'mdi:lightning-bolt',
        elements: [
            {
                id: 'ccc_energy_flows',
                label: 'Energy Flows',
                text: 'What energy transfers occur? How is energy conserved or dissipated within this system?',
                mindset: 'Conservation Logic'
            },
            {
                id: 'ccc_energy_matter',
                label: 'Matter Cycles',
                text: 'What matter flows into or out of the system? How does matter change form during these processes?',
                mindset: 'Cycling of Matter'
            }
        ]
    },
    'cat_structure': {
        title: 'Structure & Function',
        icon: 'mdi:puzzle-outline',
        elements: [
            {
                id: 'ccc_structure_shapes',
                label: 'Form and Shape',
                text: 'What shapes or structures can I observe? How does the substructure determine properties?',
                mindset: 'Structural Logic'
            },
            {
                id: 'ccc_structure_purpose',
                label: 'Functional Roles',
                text: 'What role do these specific structures play in how the overall system functions?',
                mindset: 'Substructure Analysis'
            }
        ]
    },
    'cat_stability': {
        title: 'Stability & Change',
        icon: 'mdi:balance-scale',
        elements: [
            {
                id: 'ccc_stability_conditions',
                label: 'Equilibrium',
                text: 'Under what conditions does this system remain stable? What factors maintain this balance?',
                mindset: 'Stability Analysis'
            },
            {
                id: 'ccc_stability_triggers',
                label: 'Triggers of Change',
                text: 'What changes would cause the system to become unstable or fail? What determines the rate of change?',
                mindset: 'Dynamic Evolution'
            }
        ]
    }
};

/**
 * Helper to get a specific SEP tip by ID
 */
export function getSeptipById(id) {
    if (!id) return null;
    
    // Check main library
    for (const sepKey in SEPTipsLibrary) {
        const sep = SEPTipsLibrary[sepKey];
        const tip = sep.elements.find(e => e.id === id);
        if (tip) return { sep: sepKey, ...tip };
    }
    
    // Check custom tips
    const customTip = App.teacherSettings?.customTips?.find(t => t.id === id);
    if (customTip) return customTip;

    return null;
}
window.getSeptipById = getSeptipById;

/**
 * Helper to get a specific CCC tip by ID
 */
export function getCccTipById(id) {
    if (!id) return null;

    // Check custom categories (legacy/simple support)
    const customCat = App.teacherSettings?.categories?.find(c => c.id === id);
    if (customCat && customCat.tip) {
        return {
            label: customCat.name,
            text: customCat.tip,
            mindset: customCat.mindset || 'Scientific Focus'
        };
    }

    // New way: Look through CCCTipsLibrary elements
    for (const cccKey in CCCTipsLibrary) {
        const ccc = CCCTipsLibrary[cccKey];
        const tip = ccc.elements.find(e => e.id === id);
        if (tip) return { ccc: cccKey, ...tip };
    }

    // Check custom tips for CCCs
    const customTip = App.teacherSettings?.customTips?.find(t => t.ccc === id || t.sep === id);
    if (customTip) return customTip;

    return CCCTipsLibrary[id]?.elements?.[0] || null;
}
window.getCccTipById = getCccTipById;
