window.rubrics = window.rubrics || {}; // Ensure the global object exists

window.rubrics['ela-k2'] = {
    id: 'ela-k2',
    name: 'K-2 ELA Rubric (EdReports v2.0)',
    description: 'EdReports 2.0 K-2 English Language Arts Evaluation Rubric',
    metadataFields: [
        { id: 'reviewTitle', label: 'Title of Material:', type: 'text' },
        { id: 'publisher', label: 'Publisher:', type: 'text' },
        {
            id: 'gradeLevel', label: 'Grade Level:', type: 'select', options: [
                { value: "", text: "Select Grade Level" },
                { value: "K", text: "Grade K" },
                { value: "1", text: "Grade 1" },
                { value: "2", text: "Grade 2" }
            ]
        },
        { id: 'reviewDate', label: 'Review Date:', type: 'date' },
        { id: 'reviewerName', label: 'Reviewer Name:', type: 'text' }
    ],
    gateways: [
        {
            id: 'gateway1',
            name: 'Gateway 1: Text Quality and Complexity; Alignment to Standards with Tasks and Questions',
            description: 'Texts are the foundation of ELA instruction. Gateway 1 evaluates the quality, complexity, and variety of texts, as well as how well questions and tasks align to grade-level ELA standards.',
            totalPoints: 28, // K-2 Example
            ratingThresholds: { meets: 23, partially: 16 }, // K-2 Example
            criterionSections: [
                {
                    id: 'criterion1A',
                    name: 'Criterion 1A: Text Selection (Complexity, Quality, and Range)',
                    description: 'Materials provide texts that are appropriately complex, high-quality, and reflect a range suitable for the grade band.',
                    totalPoints: 14, // K-2 Example for 1A
                    items: [
                        {
                            id: '1a',
                            name: '1a. Anchor texts and series of texts connected to them are appropriately complex for the grade band and are accompanied by a text complexity analysis.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'Anchor texts are of high quality and publishable (or comparable) worthy of careful reading.',
                                'Texts are reviewed for appropriate content. Bias and sensitivity are handled appropriately.',
                                'Anchor texts are at the appropriate grade-level complexity band (quantitative and qualitative).',
                                'Rationale is provided for texts that fall outside the grade band but are still appropriate.',
                                'Text complexity analyses are provided and accurate for anchor texts (quantitative and qualitative).'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: true
                        },
                        {
                            id: '1b',
                            name: '1b. Anchor texts and series of texts connected to them are engaging and high quality, and consider a range of student interests.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'Anchor texts and supporting texts are of high quality and engaging for students.',
                                'Texts reflect a range of student interests and experiences.',
                                'Texts are well-crafted and content-rich, engaging students at the grade level.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: true
                        },
                        {
                            id: '1c',
                            name: '1c. Materials reflect the distribution of text types and genres required by the standards at each grade level.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials include a balance of literary and informational texts according to standards.',
                                'A variety of genres within literary and informational texts is included.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1d',
                            name: '1d. Texts are revisited for multiple purposes in a way that builds student literacy.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Texts are revisited to support different reading, writing, speaking/listening, or language purposes.',
                                'Revisiting texts deepens understanding and builds literacy skills.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                         { // K-2 specific (previously 1e in older rubrics, now often integrated or separate)
                            id: '1e', // Example ID, adjust if K-2 has different numbering for this
                            name: '1e. The read-aloud and shared reading texts are appropriately complex and of high quality.',
                            scoringOptions: [0, 1, 2, 3], // Example points
                            scoringCriteria: [
                                'Read-aloud texts are above grade-level complexity for K-1 and at grade-level for Grade 2.',
                                'Shared reading texts are at grade-level complexity.',
                                'Both read-aloud and shared reading texts are high-quality and engaging.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false // Or true if it's critical for K-2
                        }
                    ]
                },
                {
                    id: 'criterion1B',
                    name: 'Criterion 1B: Questions and Tasks (Alignment to Reading Standards)',
                    description: 'Materials provide questions and tasks that are text-specific or text-dependent and align with the depth and breadth of the standards for reading.',
                    totalPoints: 14, // K-2 Example for 1B
                    items: [
                        {
                            id: '1f',
                            name: '1f. A majority of questions and tasks are text-specific and text-dependent, requiring students to engage with the text directly.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'Most questions and tasks require students to use evidence from the text.',
                                'Questions and tasks draw students back into the text to support answers.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1g',
                            name: '1g. Questions and tasks support students’ analysis of knowledge and ideas viaoyin writing, speaking, and/or listening.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'Questions and tasks require students to analyze and synthesize information from texts.',
                                'Opportunities are provided for students to share their analysis through writing and discussion.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1h',
                            name: '1h. Questions and tasks build students’ skill with text-based ELA Reading standards for Key Ideas and Details and Craft and Structure.',
                            scoringOptions: [0, 1, 2, 3], // Example points for K-2 focus
                            scoringCriteria: [
                                'Materials provide questions and tasks targeting Key Ideas and Details (e.g., main idea, summarizing, inferences).',
                                'Materials provide questions and tasks targeting Craft and Structure (e.g., text structure, author’s purpose, word choice).'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        { // K-2 has less emphasis on Integration of Knowledge and Ideas compared to older grades
                            id: '1i',
                            name: '1i. Questions and tasks build student skill with text-based ELA Reading standards for Integration of Knowledge and Ideas, where appropriate for the grade level.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials provide limited, grade-appropriate opportunities for Integration of Knowledge and Ideas (e.g., comparing texts, evaluating arguments – simpler forms in K-2).'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '1j',
                            name: '1j. Questions and tasks provide opportunities for students to develop academic language and speaking and listening skills.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials support the development of academic vocabulary in context.',
                                'Opportunities for structured discussions and presentations are provided.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                    ]
                }
            ]
        },
        {
            id: 'gateway2',
            name: 'Gateway 2: Building Knowledge with Texts, Vocabulary, and Tasks',
            description: 'Materials build knowledge systematically through coherently sequenced sets of texts and tasks. For K-2, this gateway heavily emphasizes foundational skills.',
            totalPoints: 24, // K-2 Example
            ratingThresholds: { meets: 19, partially: 13 }, // K-2 Example
            criterionSections: [
                {
                    id: 'criterion2A', // K-2 might combine or separate these differently
                    name: 'Criterion 2A: Building Knowledge and Meaning-Making',
                    description: 'Materials build knowledge through coherently sequenced sets of texts and tasks and support students in making meaning of texts.',
                    totalPoints: 10, // Example
                    items: [
                        {
                            id: '2a',
                            name: '2a. Texts are organized around topics and/or themes to build students’ ability to read and comprehend complex texts independently and proficiently.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'Texts are grouped by topics or themes to build background knowledge and vocabulary.',
                                'The sequence of texts helps students build knowledge and make connections.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '2b',
                            name: '2b. Materials provide writing tasks that are text-based and varied in type and purpose, and they build over the course of the year.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'Writing tasks are connected to texts read.',
                                'A variety of writing types (narrative, informational, opinion for K-2) is included.',
                                'Writing tasks increase in complexity and independence over the year.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '2c',
                            name: '2c. Materials provide culminating tasks that require students to demonstrate knowledge and understanding of a topic or texts through writing, speaking, and/or listening.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Culminating tasks integrate reading, writing, speaking, and listening.',
                                'Tasks require students to synthesize knowledge gained from a topic or set of texts.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                        // K-2 does not typically have separate "Research Skills" or "Language Standards" indicators here like older grades.
                    ]
                },
                { // CRITICAL for K-2
                    id: 'criterion2B',
                    name: 'Criterion 2B: Foundational Skills (K-2 Specific)',
                    description: 'Materials provide systematic and explicit instruction in foundational skills to develop proficient readers.',
                    totalPoints: 14, // Example, this is heavily weighted in K-2
                    items: [
                        {
                            id: '2d',
                            name: '2d. Materials provide systematic and explicit instruction and practice in concepts of print.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Explicit instruction in print concepts (e.g., directionality, letter-word correspondence).',
                                'Sufficient practice opportunities are provided.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: true // Often non-negotiable
                        },
                        {
                            id: '2e',
                            name: '2e. Materials provide systematic and explicit instruction and practice in phonological awareness.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'Explicit instruction follows a research-based progression of phonological awareness skills.',
                                'Sufficient multi-modal practice opportunities are provided.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: true // Often non-negotiable
                        },
                        {
                            id: '2f',
                            name: '2f. Materials provide systematic and explicit instruction and practice in phonics and word recognition.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'Explicit instruction follows a research-based scope and sequence for phonics.',
                                'Sufficient practice in decoding and encoding, including high-frequency words.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: true // Often non-negotiable
                        },
                        {
                            id: '2g',
                            name: '2g. Materials provide systematic and explicit instruction and practice in fluency.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Explicit instruction in fluency (accuracy, rate, expression).',
                                'Opportunities for repeated readings and oral reading practice with feedback.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: true // Often non-negotiable
                        },
                        {
                            id: '2h',
                            name: '2h. Materials include systematic assessment of foundational skills to inform instruction.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Regular assessments of foundational skills are provided.',
                                'Guidance on using assessment data to differentiate instruction.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                    ]
                }
            ]
        },
        {
            id: 'gateway3',
            name: 'Gateway 3: Usability',
            description: 'Materials are user-friendly for both teachers and students, supporting effective implementation and learning.',
            totalPoints: 18, // K-2 Example
            ratingThresholds: { meets: 14, partially: 10 }, // K-2 Example
            criterionSections: [
                {
                    id: 'criterion3A',
                    name: 'Criterion 3A: Teacher Planning and Implementation Supports',
                    description: 'Materials provide clear and practical supports for teachers to plan and implement instruction effectively.',
                    totalPoints: 10, // Example
                    items: [
                        {
                            id: '3a',
                            name: '3a. The Teacher’s Edition is manageable and includes clear guidance and support for teachers.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Teacher materials are well-organized and easy to navigate.',
                                'Clear explanations of lesson purposes and instructional routines.',
                                'Sufficient guidance for implementing activities and strategies.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3b',
                            name: '3b. Materials include a clear rationale and cohesive instructional plan based on research and an understanding of ELA standards.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'A clear research base for instructional approaches is provided.',
                                'The program demonstrates a cohesive design aligned with ELA standards.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3c',
                            name: '3c. Materials include a comprehensive assessment system to monitor student learning and inform instruction.',
                            scoringOptions: [0, 1, 2, 3],
                            scoringCriteria: [
                                'A variety of assessment types (diagnostic, formative, summative) is included.',
                                'Clear guidance on administering, scoring, and interpreting assessments.',
                                'Tools for tracking student progress and using data to adjust instruction.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3d',
                            name: '3d. Materials provide a realistic and manageable pacing guide and year-long plan.',
                            scoringOptions: [0, 1],
                            scoringCriteria: [
                                'A clear pacing guide for the year, units, and lessons is provided.',
                                'The plan is feasible for the typical school year.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3e',
                            name: '3e. Materials provide clear correlations and connections to ELA standards and other content areas where appropriate.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Clear alignment to grade-level ELA standards is evident.',
                                'Connections to other content areas are made when relevant.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                    ]
                },
                {
                    id: 'criterion3B',
                    name: 'Criterion 3B: Student Supports',
                    description: 'Materials provide supports to ensure all students can access and engage with grade-level content.',
                    totalPoints: 4, // Example
                    items: [
                        {
                            id: '3f',
                            name: '3f. Materials provide strategies and supports for a diverse range of learners, including English learners and students with disabilities.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Specific, actionable strategies for differentiation are provided.',
                                'Supports for various learner needs are embedded and explicit.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3g',
                            name: '3g. Materials provide extensions and opportunities for students who are ready for more advanced work.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Challenging extensions that deepen understanding are provided.',
                                'Opportunities for advanced students to engage with content at greater depth.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        }
                    ]
                },
                {
                    id: 'criterion3C',
                    name: 'Criterion 3C: Technology, Design, and Other Usability Features',
                    description: 'Materials leverage technology effectively, have a user-friendly design, and include other features that enhance usability.',
                    totalPoints: 4, // Example (combination of scored and narrative)
                    items: [
                        {
                            id: '3h',
                            name: '3h. Materials support home-school connections and parent/caregiver involvement.',
                            scoringOptions: [0, 1], // Often scored
                            scoringCriteria: [
                                'Resources or suggestions for communicating with families are provided.',
                                'Activities or information to support learning at home.'
                            ],
                            isNarrativeOnly: false, // Can be scored
                            isNonNegotiable: false
                        },
                        {
                            id: '3i',
                            name: '3i. Materials integrate digital technology, when applicable, in ways that enhance student learning and engagement.',
                            scoringOptions: [0, 1], // Often scored
                            scoringCriteria: [
                                'Technology tools are purposeful and support learning goals.',
                                'Digital resources are accessible and user-friendly for students.'
                            ],
                            isNarrativeOnly: false, // Can be scored
                            isNonNegotiable: false
                        },
                        {
                            id: '3j',
                            name: '3j. Materials provide guidance for teachers on the use of embedded technology.',
                            scoringOptions: [], // Often narrative
                            scoringCriteria: [
                                'Clear instructions and support for teachers using technology components.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false
                        },
                        {
                            id: '3k',
                            name: '3k. The visual design is clear, engaging, and supportive of student learning.',
                            scoringOptions: [], // Often narrative
                            scoringCriteria: [
                                'Layout is uncluttered and easy to follow.',
                                'Visuals are purposeful and enhance understanding without being distracting.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false
                        },
                         { // K-2 Specific item, or could be rolled into 3f/3g
                            id: '3l',
                            name: '3l. Materials provide guidance on student grouping strategies (whole group, small group, pairs, individual).',
                            scoringOptions: [0, 1, 2], // Often scored
                            scoringCriteria: [
                                'Guidance for various grouping configurations is provided.',
                                'Rationale for grouping strategies is clear.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false
                        },
                        {
                            id: '3m',
                            name: '3m. Materials include guidance for teachers on culturally responsive instructional practices and selecting culturally relevant texts, if applicable.',
                            scoringOptions: [], // Often narrative
                            scoringCriteria: [
                                'Support for teachers to understand and implement culturally responsive practices.',
                                'Guidance on considering students\' cultural backgrounds and experiences.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false
                        },
                        {
                             id: '3n', // Example for SEL or other specific focus
                             name: '3n. Materials support social-emotional learning (SEL) appropriate for the grade level.',
                             scoringOptions: [], // Often narrative
                             scoringCriteria: [
                                 'Opportunities for developing SEL competencies are integrated.',
                                 'Guidance for teachers on fostering a positive and supportive classroom environment.'
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false
                        }
                    ]
                }
            ]
        }
    ],
    finalRatingLogic: [
        // K-2 specific logic might differ slightly if G2 non-negotiables are very strict
        {
            condition: (g, scores) => { // Check non-negotiables for G1 and G2 foundational skills
                const g1NonNegotiables = ['1a', '1b']; // Example
                const g2FoundationalNonNegotiables = ['2d', '2e', '2f', '2g']; // Example
                for (const id of g1NonNegotiables) {
                    if (scores[`gateway1.criterion1A.${id}`] === 0) return true;
                }
                for (const id of g2FoundationalNonNegotiables) {
                    if (scores[`gateway2.criterion2B.${id}`] === 0) return true;
                }
                return g.gateway1 === 'Does Not Meet Expectations' || g.gateway2 === 'Does Not Meet Expectations';
            },
            result: 'Does Not Meet Expectations'
        },
        { condition: (g) => g.gateway1 === 'Meets Expectations' && g.gateway2 === 'Meets Expectations' && g.gateway3 === 'Meets Expectations', result: 'Meets Expectations' },
        { condition: (g) => g.gateway1 === 'Meets Expectations' && g.gateway2 === 'Meets Expectations' && (!g.gateway3 || g.gateway3 === 'Not Rated'), result: 'Meets Expectations (Gateway 3 not fully evaluated or not applicable)' },
        { condition: (g) => true, result: 'Partially Meets Expectations' } // Default
    ]
};

console.log("ELA K-2 Rubric Loaded:", window.rubrics['ela-k2']);