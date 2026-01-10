window.rubrics = window.rubrics || {}; // Ensure the global object exists

window.rubrics['mll-science-k12'] = {
    id: 'mll-science-k12',
    name: 'MLL Science K-12 Rubric (EdReports v2.0, 11/18/2024)',
    description: 'EdReports Multilingual Learner (MLL) Supports Review Criteria for Science Materials, Grades K-12. This rubric is based on the EdReports MLL Supports for Science Grades K-12 document, v2.0, updated 11/18/2024.',
    metadataFields: [
        { id: 'reviewTitle', label: 'Title of Material:', type: 'text' },
        { id: 'publisher', label: 'Publisher:', type: 'text' },
        {
            id: 'gradeLevel', label: 'Grade Level:', type: 'select', options: [
                { value: "K-12", text: "K-12" }
            ],
            defaultValue: "K-12"
        },
        { id: 'reviewDate', label: 'Review Date:', type: 'date' },
        { id: 'reviewerName', label: 'Reviewer Name:', type: 'text' }
    ],
    gateways: [ // In this MLL rubric, "gateways" represent the PDF's "Criteria"
        {
            id: 'criterion1_mll_participation',
            name: "Criterion 1: MLLs' Full and Complete Participation in Grade-Level Content",
            description: "Do the materials include necessary components of curriculum to allow MLLs to fully participate in grade-level content? These indicators are integrated into content-area tools in key places crucial to content. (See PDF p.3-4 for more details on indicator connections and construction).",
            totalPoints: 10,
            ratingThresholds: { meets: 8, partially: 5 }, // Meets: 8-10, Partially: 5-7, Does Not Meet: < 5
            criterionSections: [
                {
                    id: 'criterion1_indicators',
                    name: 'Indicators + Scoring Criteria',
                    description: 'Materials include necessary components of curriculum to allow MLLs to fully participate in grade-level content, integrated into content-area tools in key places crucial to content.',
                    totalPoints: 10,
                    items: [
                        {
                            id: '1a.MLL-1',
                            name: "1a.MLL-1 Materials provide support for MLLs' full and complete participation in grade-level learning of phenomena as included in the materials.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently provide strategies and supports for MLLs to fully and completely participate in grade-level learning of phenomena as included in the materials.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1a.MLL-2',
                            name: "1a.MLL-2 Materials provide support for MLLs' full and complete participation in grade-level learning of problems as included in the materials.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently provide strategies and supports for MLLs to fully and completely participate in grade-level learning of problems as included in the materials.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1g.MLL-1',
                            name: "1g.MLL-1 Materials provide support for MLLs' full and complete participation in sensemaking of the Science and Engineering Practices.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently provide strategies and supports for MLLs to fully and completely participate in sensemaking of Science and Engineering practices.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1g.MLL-2',
                            name: "1g.MLL-2 Materials provide support for MLLs' full and complete participation in sensemaking of Disciplinary Core Ideas.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently provide strategies and supports for MLLs to fully and completely participate in sensemaking of Disciplinary Core Ideas.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1g.MLL-3',
                            name: "1g.MLL-3 Materials provide support for MLLs' full and complete participation in sensemaking of Cross Cutting Concepts.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently provide strategies and supports for MLLs to fully and completely participate in sensemaking of Cross Cutting Concepts.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                    ]
                }
            ]
        },
        {
            id: 'criterion2_mll_coherence',
            name: 'Criterion 2: Coherence of MLL Supports',
            description: "Are MLL supports intentionally developed over time and do they reflect the interdependence of language and content? (See PDF p.5 for more details on indicator connections).",
            totalPoints: 7,
            ratingThresholds: { meets: 5, partially: 3 }, // Meets: 5-7, Partially: 3-4, Does Not Meet: < 3
            criterionSections: [
                {
                    id: 'criterion2_indicators',
                    name: 'Indicators + Scoring Criteria',
                    description: 'MLL supports are intentionally developed over time and reflect the interdependence of language and content.',
                    totalPoints: 7,
                    items: [
                        {
                            id: '2.1.MLL-1',
                            name: "2.1.MLL-1 Materials intentionally develop language in ways valued by disciplinary practices over time, across lessons, units, and throughout the course.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials show evidence of the intentional development of language in ways valued by disciplinary practices over time, through lessons, units, and throughout the course.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '2.1.MLL-2',
                            name: "2.1.MLL-2 Materials include a scope & sequence that develops different language learning goals over time (activities, lessons, units, courses), similar to the progression of content and practice learning objectives, to build toward student independence.",
                            scoringOptions: [0, 1],
                            scoringCriteria: [
                                'Materials include a scope & sequence that develops different language learning goals over time (activities, lessons, units, courses), similar to the progression of content and practice learning objectives, to build toward student independence.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '2.1.MLL-3',
                            name: "2.1.MLL-3 Materials include language goals/objectives that are incorporated at the individual lesson level.",
                            scoringOptions: [0, 2, 3, 4],
                            scoringCriteria: [
                                'Materials include language goals/objectives incorporated at the lesson level that are clear, measurable, and tied directly to the content objectives.',
                                'Materials include language goals/objectives incorporated at the lesson level that are written according to what designers want students to do with language (language functions), and/or the language structures and vocabulary that are used to support those functions (language forms).',
                                "Materials include language goals/objectives incorporated at the lesson level that are clearly focused on at least one of the four domains of language: speaking, listening, reading, and writing."
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                    ]
                }
            ]
        },
        {
            id: 'criterion3_mll_teacher_guidance',
            name: 'Criterion 3: Teacher Guidance',
            description: "Do materials provide guidance for all teachers to effectively implement the provided strategies and supports for MLLs? (See PDF p.6 for more details on indicator connections).",
            totalPoints: 13,
            ratingThresholds: { meets: 7, partially: 4 }, // Meets: 7-13, Partially: 4-6, Does Not Meet: < 4
            criterionSections: [
                {
                    id: 'criterion3_indicators',
                    name: 'Indicators + Scoring Criteria',
                    description: 'Materials provide guidance for all teachers to effectively implement the provided strategies and supports for MLLs.',
                    totalPoints: 13,
                    items: [
                        {
                            id: '3e.MLL',
                            name: "3e.MLL Materials provide explanations of the instructional approaches of the program for MLLs and identification of the research-based strategies.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials explain the instructional approaches of the program for MLLs.',
                                'Materials include and reference research-based strategies for the MLL approach.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3.1.MLL-1',
                            name: "3.1.MLL-1 Materials provide teacher guidance to support MLL students and to utilize the strategies, supports, and/or accommodations found.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials provide comprehensive guidance that will assist teachers in supporting MLL students and to utilize the strategies, supports, and/or accommodations found.',
                                'Materials include sufficient and useful annotations and suggestions that are presented within the context of the lessons where the strategies, supports, and/or accommodations are to be used.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3.1.MLL-2',
                            name: "3.1.MLL-2 Materials include guidance for teachers to engage students in drawing attention to the use and development of language functions within disciplinary practices, allowing students to link language to concepts.",
                            scoringOptions: [0, 1],
                            scoringCriteria: [
                                'Materials include guidance for teachers to engage students in drawing attention to the use and development of language functions within disciplinary practices, allowing students to link language to concepts.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3.1.MLL-3',
                            name: "3.1.MLL-3 Materials guide teachers on how to match students with language supports, progressing along a continuum, and to be responsive to students' current language development in relation to the content.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                "Materials guide teachers on how to match students with language supports, progressing along a continuum.",
                                "Materials guide teachers on how to be responsive to students' current language development in relation to the content."
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3.1.MLL-4',
                            name: "3.1.MLL-4 Materials provide guidance for teachers around using suggested scaffolds and supports with different program models for MLLs.",
                            scoringOptions: [0, 1],
                            scoringCriteria: [
                                'Materials include guidance for teachers around using suggested scaffolds and supports with different program models for MLLs.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3m.MLL',
                            name: "3m.MLL Materials include guidance for intentional and flexible grouping structures for MLLs to ensure equitable participation.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials include guidance for intentional and flexible grouping structures for MLLs.',
                                'Materials include guidance to ensure equitable participation for MLLs in group work.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3.2.MLL-1',
                            name: "3.2.MLL-1 Materials provide guidance to encourage teachers to draw upon student home language to facilitate learning.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently provide guidance to encourage teachers to draw upon student home language to facilitate learning.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3.2.MLL-2',
                            name: "3.2.MLL-2 Materials provide scaffolds and supports in an equitable way.",
                            scoringOptions: [0, 1],
                            scoringCriteria: [
                                'Materials provide scaffolds and supports in an equitable way.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                    ]
                }
            ]
        },
        {
            id: 'criterion4_mll_assessment',
            name: 'Criterion 4: Assessment',
            description: "Do materials provide guidance for teachers on how MLLs can demonstrate their knowledge and understanding of grade-level content, regardless of language ability, as well as providing guidance on formatively assessing for language alongside content? (See PDF p.8 for more details on indicator connections).",
            totalPoints: 5,
            ratingThresholds: { meets: 4, partially: 2 }, // Meets: 4-5, Partially: 2-3, Does Not Meet: < 2
            criterionSections: [
                {
                    id: 'criterion4_indicators',
                    name: 'Indicators + Scoring Criteria',
                    description: 'Materials provide guidance for teachers on how MLLs can demonstrate their knowledge and understanding of grade-level content, regardless of language ability, as well as providing guidance on formatively assessing for language alongside content.',
                    totalPoints: 5,
                    items: [
                        {
                            id: '3n.MLL',
                            name: "3n.MLL Assessments offer accommodations that allow MLLs to demonstrate their knowledge and skills without changing the content of the assessment.",
                            scoringOptions: [0, 1],
                            scoringCriteria: [
                                'Assessments offer accommodations that allow MLLs to demonstrate their knowledge and skills without changing the content of the assessment.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1.2.MLL-1',
                            name: "1.2.MLL-1 Materials include a formative assessment plan for language alongside content that includes a connection to established unit/lesson language goals.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials include a formative assessment plan for language alongside content that consistently includes a connection to established unit/lesson language goals.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1.2.MLL-2',
                            name: "1.2.MLL-2 Materials include guidance for gathering, analyzing, using, and communicating language and content data from formative assessments in a cycle of continuous improvement.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently include guidance for gathering, analyzing, using, and communicating language and content data from formative assessments in a cycle of continuous improvement.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                    ]
                }
            ]
        }
    ],
    finalRatingLogic: [] // As per PDF: "there is not an overall MLL gateway or summary score."
                       // Individual Criterion ratings (Meets, Partially, Does Not Meet) are the outputs.
};

console.log("MLL Science K-12 Rubric Loaded:", window.rubrics['mll-science-k12']);