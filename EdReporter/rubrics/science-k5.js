// Rubric Data: EdReports 2.0 K-5 Science Evaluation Rubric (Example Structure)
// This object defines the entire structure, scoring, and criteria text for the rubric.

window.rubrics = window.rubrics || {}; // Ensure the global object exists

window.rubrics['science-k5'] = {
    id: 'science-k5',
    name: 'NGSS K-5 Science Rubric (EdReports v2.0)',
    description: 'EdReports 2.0 NGSS Grades K-5 Science Evaluation Rubric',
    metadataFields: [
        { id: 'reviewTitle', label: 'Title of Material:', type: 'text' },
        { id: 'publisher', label: 'Publisher:', type: 'text' },
        {
            id: 'gradeLevel', label: 'Grade Level:', type: 'select', options: [
                { value: "", text: "Select Grade Level" },
                { value: "K", text: "Grade K" },
                { value: "1", text: "Grade 1" },
                { value: "2", text: "Grade 2" },
				{ value: "3", text: "Grade 3" },
                { value: "4", text: "Grade 4" },
                { value: "5", text: "Grade 5" }
            ]
        },
        { id: 'reviewDate', label: 'Review Date:', type: 'date' },
        { id: 'reviewerName', label: 'Reviewer Name:', type: 'text' }
    ],
    gateways: [
        {
            id: 'gateway1',
            name: 'Gateway 1: Designed for NGSS',
            description: 'Materials leverage science phenomena and engineering problems in the context of driving learning and student performance and are designed for three-dimensional learning and assessment.',
            totalPoints: 34, // Total possible points for this gateway
            // Rating thresholds: [points needed for Partially Meets, points needed for Meets]
            ratingThresholds: [20, 28],
            criterionSections: [
                {
                    id: 'criterion1.1',
                    name: 'Criterion 1.1: Phenomena and Problems Drive Learning',
                    description: 'Materials leverage science phenomena and engineering problems in the context of driving learning and student performance.',
                    items: [
                        {
                            id: '1a',
                            name: '1a. Materials are designed to include both phenomena and problems.',
                            scoringOptions: [0, 2, 4],
                            scoringCriteria: [
                                'Materials consistently provide learning opportunities that include phenomena or problems.',
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                indicatorName: "Materials are designed to include both phenomena and problems.",
                                guidingQuestion: "Are the materials designed to include both phenomena and problems?",
                                purpose: "This indicator examines the presence, structure, function, and use of phenomena and problems in materials. It also sets the stage for review of indicators 1b, 1c, and 1d, as those indicators are dependent on identification of phenomena and/or problems.",
                                researchConnection: "“CONCLUSION 2: Teachers can use students' curiosity to motivate learning by choosing phenomena and design challenges that are interesting and engaging to students, including those that are locally and/or culturally relevant. Science investigation and engineering design give middle and high school students opportunities to engage in the wider world in new ways by providing agency for them to develop questions and establish the direction for their own learning experiences.” (Science and Engineering for Grades 6-12: Investigation and Design at the Center, p. 4)",
                                scoringDetails: [
                                    { score: 4, text: "Materials consistently provide learning opportunities that include phenomena and/or problems." },
                                    { score: 2, text: "Materials provide learning opportunities that include phenomena and/or problems, but inconsistently." },
                                    { score: 0, text: "Materials provide few to no learning opportunities that include phenomena. OR Materials provide few to no learning opportunities that include problems." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review all learning sequences and learning opportunities where the materials claim the presence of a phenomenon or problem in both student and teacher materials across the course."
                                    ],
                                    recordEvidence: [
                                        "Describe where students are presented with a specific, observable event that can be explained by science content as an introduction to a learning opportunity or sequence (phenomenon).",
                                        "Describe where students are presented with a challenge or situation that people want to change (problem) or a solution to optimize (design challenge) as an introduction to a learning opportunity or sequence.",
                                        "Determine if students return to the phenomenon, problem, or design challenge in the learning opportunity or sequence after its initial introduction.",
                                        "Determine if the phenomenon is unexplained or if the materials immediately provide students with an explanation.",
                                        "Determine if the materials provide context for the problem or design challenge and if students understand why they are solving the problem or design challenge."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Which instances of phenomena, problems, and design challenges are returned to and not only used as an introduction?",
                                        "Are phenomena, problems, and design challenges present at the learning opportunity or learning sequence level, or a combination of the two?",
                                        "Which instances of problems and design challenges provide students the opportunity to develop multiple solutions? Which instances only provide students with a single solution or design to build?",
                                        "How many phenomena, problems, and design challenges are present in the materials?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '1b',
                            name: '1b. Phenomena or problems require student use of grade-band Disciplinary Core Ideas.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Phenomena and problems consistently connect to grade-band appropriate DCIs or their elements.',
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                indicatorName: "Phenomena and/or problems require student use of grade-band Disciplinary Core Ideas.",
                                guidingQuestion: "Are the phenomena or problems connected to grade-band Disciplinary Core Ideas (DCIs)?",
                                purpose: "This indicator examines whether phenomena or problems within the course are rooted in grade-band appropriate DCIs.",
                                researchConnection: "Read information for Gateway 1, Criterion 1.",
                                scoringDetails: [
                                    { score: 2, text: "Phenomena and/or problems consistently connect to grade-band appropriate DCIs or their elements." },
                                    { score: 1, text: "Phenomena and/or problems connect to grade-band DCIs or their elements, but not consistently." },
                                    { score: 0, text: "Phenomena and/or problems do not connect to grade-band DCIs or their elements." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review all locations where a phenomenon or problem has been identified in the materials (see Indicator 1a)."
                                    ],
                                    recordEvidence: [
                                        "Determine what DCI element is connected. DCIs must be on grade-band and come from the life, physical, or earth and space science domains. If a problem or phenomenon is connected to an ETS DCI, it must also be connected to one of the other three domains.",
                                        "Phenomena and problems may demonstrate multiple DCIs. Use the presentation and supporting text/materials to determine the DCI focus."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do phenomena connect to grade-band appropriate DCIs or their elements?",
                                        "How often do problems connect to grade-band appropriate DCIs or their elements?",
                                        "How often do problems only connect to grade-band ETS DCIs and not DCIs from life, physical, or earth and space science?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '1c',
                            name: '1c. Phenomena and/or problems are presented in a direct manner to students.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently present phenomena and/or problems in a direct manner to students.',
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Phenomena and/or problems are presented in a direct manner to students.",
                                guidingQuestion: "Are phenomena and/or problems presented to students in a direct manner that creates a common experience and entry point?",
                                purpose: "This indicator examines the materials to determine whether phenomena and/or problems in the course are presented in a direct manner to students. It also examines the materials for a common experience for all students from which knowledge can be built; it does not assume that all students have background knowledge and experience.",
                                researchConnection: "\"...opportunities for students to engage in direct observations of phenomena illustrate the process of basic scientific research.\" (Taking Science to School, pp. 13-14)\n\n\"By using familiar materials and phenomena, students can more readily conjure up their own ideas and experiences and tap into these as they build explanations. This makes it possible for every student to participate in a more meaningful way.” (Ready Set Science, p. 93)",
                                scoringDetails: [
                                    { score: 2, text: "Materials consistently present phenomena and/or problems in a direct manner to students." },
                                    { score: 1, text: "Materials present phenomena and/or problems in a direct manner to students, but not consistently." },
                                    { score: 0, text: "Phenomena and/or problems are presented in a direct manner to students in few to no instances." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review all locations where a phenomenon or problem is introduced in the course."
                                    ],
                                    recordEvidence: [
                                        "Describe how the phenomenon or problem is presented to students. This may include multiple components. Consider everything the students engage with.",
                                        "A variety of presentations is acceptable: direct observation, observation by video or other multimedia, simulations, teacher demonstration, pictures, reading about them, etc.",
                                        "Describe how the presentation provides context for all students to share a common understanding of the phenomenon or problem, even if they aren't familiar with it.",
                                        "Describe how the presentation makes it clear what to attend to in the phenomenon or problem. Describe any distracting elements of the presentation."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do the materials present phenomena and/or problems in a direct manner to students?",
                                        "How often do the materials present phenomena and/or problems in a way that is not direct (e.g. contains distracting information or not enough context)?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '1d',
                            name: '1d. Materials intentionally leverage students\' prior knowledge and/or experiences related to phenomena or problems.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently elicit and leverage students\' prior knowledge and/or experience related to phenomena and problems.',
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials intentionally leverage students' prior knowledge and/or experiences related to phenomena or problems.",
                                guidingQuestion: "Do the materials intentionally leverage students' prior knowledge and/or experiences related to phenomena or problems?",
                                purpose: "This indicator examines the materials to determine if they are designed to both elicit and leverage students' prior knowledge and/or experiences to support engaging with phenomena or solving problems. It also emphasizes the importance of student questions in driving learning.",
                                researchConnection: "\"Everyday experience provides a rich base of knowledge and experience to support conceptual changes in science. Students bring cultural funds of knowledge that can be leveraged, combined with other concepts, and transformed into scientific concepts over time. Everyday contexts and situations that are important in children's lives not only influence their repertoires of practice but also are likely to support their development of complex cognitive skills.\" (A Framework for K-12 Science Education, p. 284).\n\n\"To advance students' conceptual understanding, prior knowledge and questions should be evoked and linked to experiences with experiments, data, and phenomena.\" (Taking Science to School, p. 251)\n\n“As instruction taps their entering knowledge and skills, students must reconcile their prior knowledge and experiences with new, scientific meanings of concepts, terms, and practices.” (Taking Science to School, p. 264)",
                                scoringDetails: [
                                    { score: 2, text: "Materials consistently elicit and leverage students' prior knowledge and/or experience related to phenomena and problems." },
                                    { score: 1, text: "Materials elicit and leverage students' prior knowledge and/or experience related to phenomena and problems but not consistently. OR Materials consistently elicit but do not consistently leverage students' prior knowledge and/or experience related to phenomena and problems." },
                                    { score: 0, text: "Materials elicit but do not leverage students' prior knowledge and/or experience related to phenomena and problems, but not consistently." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review all locations where a phenomenon or problem has been identified."
                                    ],
                                    recordEvidence: [
                                        "Describe where the materials explicitly provide opportunities for students to share their prior knowledge and/or experience, from outside the classroom, connected to phenomena and/or problems or directly related science content (eliciting).",
                                        "Describe where the materials explicitly use elicited prior knowledge and/or experience (leveraging). Describe how the materials incorporate students' prior knowledge and/or experience into instruction.",
                                        "Describe where the materials explicitly leverage students' prior knowledge and/or experience to make sense of phenomena and/or solve problems.",
                                        "Describe where the materials explicitly leverage students' prior knowledge and/or experience to support them to see changes in their ideas or understanding.",
                                        "Note instances of activating prior knowledge from within the course, making predictions, asking questions, and other forms of implicit engagement of prior knowledge and/or experience rather than explicit elicitation and leveraging."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do the materials provide support for only eliciting students' prior knowledge and/or experiences connected to phenomena and problems?",
                                        "How often do the materials provide support for both eliciting and leveraging students' prior knowledge and/or experiences connected to phenomena and problems?",
                                        "How often do the materials provide support for leveraging students' prior knowledge and/or experience for the same phenomena and/or problems when they span multiple learning opportunities?",
                                        "How often do the materials implicitly engage students' prior knowledge and/or experience, such as making predictions, without explicitly asking students about their prior knowledge and/or experience."
                                    ]
                                }
                            }
                        },
                        {
                            id: '1e',
                            name: '1e. Phenomena and/or problems drive student learning using key elements of all three dimensions.',
                            scoringOptions: [0, 3, 6],
                            scoringCriteria: [
                                'Materials consistently use phenomena or problems to drive student learning.',
                                'Materials consistently use phenomena or problems to engage with all three dimensions.',
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Phenomena and/or problems drive student learning using key elements of all three dimensions.",
                                guidingQuestion: "Do phenomena and/or problems drive instruction using key elements of all three dimensions?",
                                purpose: "This indicator examines the materials to determine if they are designed to engage students in explaining phenomena or solving design problems in meaningful ways. It also examines whether materials use phenomena or problems to support students to engage with and apply the three dimensions (DCIs, SEPs, CCCs).",
                                researchConnection: "Read information for Gateway 1, Criterion 1.",
                                scoringDetails: [
                                    { score: 6, text: "Materials consistently use phenomena or problems to drive student learning. AND Materials consistently use phenomena or problems to engage with all three dimensions." },
                                    { score: 3, text: "Materials use phenomena or problems to drive student learning, but not consistently. AND Materials use phenomena or problems to engage with all three dimensions, but not consistently or consistently with two dimensions." },
                                    { score: 0, text: "Materials provide few to no instances that use phenomena or problems to drive student learning. OR Materials provide few to no instances that use phenomena or problems to engage with two or three dimensions." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the student and teacher materials across the course."
                                    ],
                                    recordEvidence: [
                                        "Determine where phenomena and/or problems serve as a central component of the student activity and learning.",
                                        "Determine where the goal of student activity and learning is to explain a phenomenon or solve a problem, or to work towards an explanation or solution.",
                                        "Determine where the connection between the phenomenon and/or problem and student activity is apparent to students.",
                                        "Determine which elements of the three dimensions are directly part of student engagement with the phenomenon and/or problem.",
                                        "Describe where and how students return to the phenomenon and/or problem after it is initially introduced.",
                                        "Describe where a phenomenon or problem is present, but does not drive instruction, such as when they “bookend” instruction and are only present at the beginning and end of a sequence.",
                                        "When a phenomenon and/or problem does not drive learning, describe what drives learning instead. Are students focused on a DCI or science concept, completing an activity or lab not connected to a phenomenon or problem, answering a guiding question, etc.?"
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often are students engaged in phenomenon and/or problem-driven activities and learning?",
                                        "When phenomena and/or problems drive student learning, how often do students engage with DCIs, SEPs, and CCCs in order to explain the phenomenon or solve the problem?",
                                        "How often is student learning driven by something other than a phenomenon or problem?"
                                    ]
                                }
                            }
                        },
                    ]
                },
                 {
                     id: 'criterion1.2',
                     name: 'Criterion 1.2: Three-Dimensional Learning and Assessment',
                     description: 'Materials are designed for three-dimensional learning and assessment.',
                     items: [
                         {
                             id: '1f',
                             name: '1f. Materials are designed to incorporate the three dimensions in student learning opportunities.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Learning sequences consistently include student learning opportunities that incorporate the three dimensions.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials are designed to incorporate the three dimensions in student learning opportunities.",
                                guidingQuestion: "Are the materials designed to incorporate the three dimensions into student learning opportunities?",
                                purpose: "This indicator examines the materials to determine if individual learning opportunities are designed to include the three dimensions.",
                                researchConnection: "\"...the framework and its resulting standards have a number of implications for implementation, one of which involves the need for curricular and instructional materials that embody all three dimensions: scientific and engineering practices, crosscutting concepts, and disciplinary core ideas.” (A Framework for K-12 Science Education, p. 316)",
                                scoringDetails: [
                                    { score: 2, text: "Learning sequences consistently include student learning opportunities that incorporate the three dimensions." },
                                    { score: 1, text: "Learning sequences include student learning opportunities that incorporate the three dimensions, but not consistently." },
                                    { score: 0, text: "Few to no learning sequences include student learning opportunities that incorporate the three dimensions." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials across the course."
                                    ],
                                    recordEvidence: [
                                        "Identify the presence of below and/or above grade band elements.",
                                        "Note any patterns in how learning opportunities that include the three dimensions are distributed across the materials.",
                                        "Only look for the presence of the elements. Do not consider the quality of student engagement with the elements or integration of the elements. (See 1h)"
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do learning opportunities include the three dimensions?",
                                        "How many of these learning opportunities are present within each learning sequence?",
                                        "Consider the number of overall learning opportunities in the materials and how many include the three dimensions, per learning sequence.",
                                        "How many learning sequences include at least one learning opportunity where students engage in all three dimensions?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '1g',
                             name: '1g. Materials consistently support meaningful student sensemaking with the three dimensions.',
                             scoringOptions: [0, 2, 4],
                             scoringCriteria: [
                                 'Materials are designed for the three dimensions to consistently and meaningfully support student sensemaking across the learning sequences.',
                                 'Materials consistently provide opportunities for students to iterate on their thinking as they engage in sensemaking.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                              evidenceGuide: {
                                indicatorName: "Materials consistently support meaningful student sensemaking with the three dimensions.",
                                guidingQuestion: "Are the materials designed to support meaningful student sensemaking with the three dimensions?",
                                purpose: "This indicator supports the Next Generation Science Standards (NGSS) innovation related to integration of the three dimensions in learning experiences to support sensemaking.",
                                researchConnection: "\"Each NGSS standard integrates one specific SEP, CCC, and DCI into a performance expectation that details what students should be proficient in by the end of instruction. In past standards the separation of skills and knowledge often led to an emphasis (in both instruction and assessment) on science concepts and an omission of inquiry and practices. It is important to note that the NGSS performance expectations do not specify or limit the intersection of the three dimensions in classroom instruction. Multiple SEPs, CCCs, and DCIs that blend and work together in several contexts will be needed to help students build toward competency in the targeted performance expectations. (2015 Achieve NGSS Innovations, pp. 1-2)",
                                scoringDetails: [
                                    { score: 4, text: "Materials are designed for the three dimensions to consistently and meaningfully support student sensemaking across the learning sequences. AND Materials consistently provide opportunities for students to iterate on their thinking as they engage in sensemaking." },
                                    { score: 2, text: "Materials are designed for two dimensions to consistently and meaningfully support student sensemaking across the learning sequences. OR Materials are designed for the three dimensions to meaningfully support sensemaking across the learning sequences, but not consistently. OR Materials provide opportunities for students to iterate on their thinking as they engage in sensemaking, but not consistently." },
                                    { score: 0, text: "Materials are designed to meaningfully support student sensemaking with two dimensions across the learning sequences, but not consistently. OR Materials do not provide opportunities for students to iterate on their thinking as they engage in sensemaking." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials across the course."
                                    ],
                                    recordEvidence: [
                                        "Determine where students engage with novel, uncertain, or unexplained phenomena, problems, or scientific concepts.",
                                        "Determine where students use their prior knowledge, new information, and evidence to figure out novel, uncertain, or unexplained phenomena, problems, or scientific concepts.",
                                        "Determine where students have the opportunity to iterate on their thinking as they figure out novel, uncertain, or unexplained phenomena, problems, or scientific concepts. This includes both discourse and individual reflection.",
                                        "Determine where student sensemaking requires meaningful, intentional, and integrated use of SEPs, CCCs, and DCIs.",
                                        "Determine where meaningful and intentional presence of two-dimensional integration of SEPs and DCIs, CCCs and DCIs, or CCCs and SEPs occurs.",
                                        "Identify the presence of above and/or below grade band elements associated with sensemaking."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do learning sequences contain three-dimensional sensemaking?",
                                        "How often do learning sequences contain two-dimensional sensemaking?",
                                        "How often do learning sequences contain opportunities for students to iterate on their thinking as they engage in sensemaking?"
                                    ]
                                }
                            }
                         },
                          {
                             id: '1h',
                             name: '1h. Materials clearly represent three-dimensional learning objectives within the learning sequences.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'The materials consistently provide element-level three-dimensional learning objectives.',
                                 'Materials consistently provide opportunities for students to use and engage with the elements of the three dimensions present in the objectives.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials clearly represent three-dimensional learning objectives within the learning sequences.",
                                guidingQuestion: "Are the materials designed to clearly represent three-dimensional learning objectives within the learning sequences?",
                                purpose: "This indicator examines the materials to determine if there is a clear connection between the three dimensional learning objectives and the learning sequences. It does not look for exact matches of designed learning experiences to the performance expectations.",
                                researchConnection: "\"It should also be noted that one performance expectation should not be equated to one lesson. Performance expectations define the three-dimensional learning expectations for students, and it is unlikely that a single lesson would provide adequate opportunities for a student to demonstrate proficiency in every dimension of a performance expectation. A series of high-quality lessons or a unit in a program are more likely to provide these opportunities.” (2015 Achieve NGSS Innovations, pp. 1-2)",
                                scoringDetails: [
                                    { score: 2, text: "The materials consistently provide element-level three-dimensional learning objectives. AND Materials consistently provide opportunities for students to use and engage with the elements of the three dimensions present in the objectives." },
                                    { score: 1, text: "The materials provide element-level three-dimensional learning objectives, but not consistently. OR Materials provide opportunities for students to use and engage with the elements of the three dimensions present in the objectives, but not consistently." },
                                    { score: 0, text: "The materials provide few to no element-level three-dimensional learning objectives. OR Materials provide few to no opportunities for students to use and engage with the elements of the three dimensions present in the objectives." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials across the course."
                                    ],
                                    recordEvidence: [
                                        "Identify the learning objectives for each learning sequence or opportunity. Determine if the learning objectives are three dimensional and if they provide element-level information. If component level specificity is provided, assume all elements within that component are intended to be present.",
                                        "Determine where there is a match between the learning objectives and what students are actually asked to do in learning opportunities and sequences."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often are three-dimensional learning objectives present? If so, do they detail element-level specificity?",
                                        "How often do learning sequences or opportunities provide opportunities for students to use the elements of the three dimensions in the learning objectives?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '1i',
                             name: '1i. Materials include a formative assessment system that is designed to reveal student progress on targeted learning objectives.',
                             scoringOptions: [0, 2, 4],
                             scoringCriteria: [
                                 'The formative assessments are consistently designed to reveal student progress on the targeted learning objectives.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                              evidenceGuide: {
                                indicatorName: "Materials include a formative assessment system that is designed to reveal student progress on targeted learning objectives.",
                                guidingQuestion: "Are the materials designed to include a formative assessment system that reveals student progress on targeted learning objectives?",
                                purpose: "This indicator examines whether the materials include formative assessments that are connected to and reveal student progress on the targeted learning objectives.",
                                researchConnection: "“Assessments used for formative purposes occur during the course of a unit of instruction and may involve both formal tests and informal activities conducted as part of a lesson. They may be used to identify students' strengths and weaknesses, assist educators in planning subsequent instruction, assist students in guiding their own learning by evaluating and revising their own work, and foster students' sense of autonomy and responsibility for their own learning (Andrade and Cizek, 2010, p. 4).” (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 84)",
                                scoringDetails: [
                                    { score: 4, text: "The formative assessments are consistently designed to reveal student progress on the targeted learning objectives." },
                                    { score: 2, text: "The formative assessments are designed to reveal student progress on the targeted learning objectives, but not consistently." },
                                    { score: 0, text: "Few to no formative assessments are designed to reveal student progress on the targeted learning objectives." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "All identified formative assessment tasks in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Use the learning objectives identified in indicator 1h.",
                                        "Identify elements of the learning objectives in the formative assessments. Formative assessments can include activities for individuals or groups of students.",
                                        "Determine how many elements of the learning objectives are addressed in the assessments. Consider all formative assessments within each sequence associated with a set of learning objectives.",
                                        "Look for the presence of all elements indicated by the objectives (including off-grade band elements).",
                                        "Do not focus on supports for interpreting assessments. These are covered in the examination of the assessment system in indicators 3g and 3n in Gateway 3."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Which types of assessments are used to support the formative process? Where are they present? Are they always consistent in form and function, or do they vary?",
                                        "How many elements are evaluated in the formative assessments associated with a set of learning objectives?",
                                        "How many learning sequences or opportunities assess most or all of the elements from the associated learning objectives?",
                                        "How do formative assessments within the assessment system reveal student progress and use of the three dimensions as connected to the learning objectives?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '1j',
                             name: '1j. Materials include a summative assessment system designed to elicit direct, observable evidence of student achievement of claimed standards.',
                             scoringOptions: [0, 2, 4],
                             scoringCriteria: [
                                 'Materials consistently identify the standards assessed for summative assessments.',
                                 'The summative assessment system is designed to measure student achievement of all or nearly all of the claimed assessment standards.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials include a summative assessment system designed to elicit direct, observable evidence of student achievement of claimed assessment standards.",
                                guidingQuestion: "Are the materials designed to include a summative assessment system that is designed to elicit direct, observable evidence of student achievement of claimed assessment standards?",
                                purpose: "This indicator determines whether the materials identify the standards addressed by each assessment in the summative assessment system. It also examines whether the summative assessment system is designed to elicit evidence of learning of all of the claimed assessment standards.",
                                researchConnection: "“RECOMMENDATION 4-2 Curriculum developers, assessment developers, and others who create resource materials aligned to the science framework and the Next Generation Science Standards should ensure that assessment activities included in such materials (such as mid- and end-of-chapter activities, suggested tasks for unit assessment, and online activities) require students to engage in practices that demonstrate their understanding of core ideas and crosscutting concepts.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 131)",
                                scoringDetails: [
                                    { score: 4, text: "Materials consistently identify the standards assessed for summative assessments. AND The summative assessment system is designed to measure student achievement of all or nearly all of the claimed assessment standards." },
                                    { score: 2, text: "Materials identify the standards assessed for summative assessments, but not consistently. OR The summative assessment system is designed to measure student achievement of most of the claimed assessment standards." },
                                    { score: 0, text: "Numerous summative assessments do not identify the standards assessed. OR Numerous claimed assessment standards are not measured by the summative assessment system." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "All identified summative assessments in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Determine where the materials identify the standards assessed by each assessment or assessment question.",
                                        "Determine what standards are measured by each assessment. Individual SEPs, DCIs, or CCCs may individually be present in each of the various components of an assessment within the summative process.",
                                        "Do not consider assessment of standards outside of the grade-band.",
                                        "Do not focus on supports for interpreting assessments. These are covered in the examination of the assessment system in indicators 3g and 3n in Gateway 3."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How many assessments include information about what standards are addressed by the assessment or individual assessment questions.",
                                        "How many of the claimed assessment standards are measured across the summative assessment system?",
                                        "Describe the types of summative assessments used to determine individual student achievement (performance tasks, multiple choice questions, written/constructed responses, etc.). Where are they present? Are they always consistent in form and function or do they vary?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '1k',
                             name: '1k. Materials are designed to incorporate three-dimensional assessments that incorporate uncertain phenomena or problems.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials consistently provide assessments that integrate the three dimensions.',
                                 'Assessments consistently incorporate uncertain phenomena or problems.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials are designed to include three-dimensional assessments that incorporate uncertain phenomena or problems.",
                                guidingQuestion: "Are the materials designed to incorporate three-dimensional assessments that incorporate uncertain phenomena or problems?",
                                purpose: "This indicator determines if materials are designed to incorporate three-dimensional assessments that incorporate uncertain phenomena or problems.",
                                researchConnection: "\"Assessment tasks, in turn, have to be designed to provide evidence of students' ability to use the practices, to apply their understanding of the crosscutting concepts, and to draw on their understanding of specific disciplinary ideas, all in the context of addressing specific problems.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 32)",
                                scoringDetails: [
                                    { score: 2, text: "Assessments consistently incorporate uncertain phenomena or problems. AND When incorporating uncertain phenomena or problems, assessments consistently integrate the three dimensions." },
                                    { score: 1, text: "Assessments incorporate uncertain phenomena or problems, but not consistently. OR When incorporating uncertain phenomena or problems, assessments integrate the three dimensions, but not consistently. OR When incorporating uncertain phenomena or problems, assessments integrate two dimensions consistently." },
                                    { score: 0, text: "Few to no assessments incorporate uncertain phenomena or problems. OR When incorporating uncertain phenomena or problems, few to no assessments integrate the three dimensions. OR When incorporating uncertain phenomena or problems, assessments integrate two dimensions, but not consistently." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "All identified summative and formative assessments in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Use information about elements identified in formative and summative assessment tasks from indicators 1i and 1j.",
                                        "Describe when and how the assessments provide students the opportunity to apply their learning to an uncertain phenomenon or problem. An uncertain phenomenon or problem can consist of a completely novel scenario or a new aspect of a phenomenon or problem students have already engaged with.",
                                        "Describe how elements of the three dimensions are used together in assessments and assessment questions. In a set of questions related to the same scenario or phenomenon, the three dimensions may be present across the set. They do not need to all be present in a single question. For a single question related to an isolated phenomenon or scenario, look for the presence of all three dimensions in the question.",
                                        "Do not consider assessment of standards outside of the grade-band.",
                                        "Do not focus on supports for interpreting assessments, as these are covered in the examination of the assessment system in indicators 3g and 3n in Gateway 3."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do assessments include opportunities for students to engage with uncertain phenomena and problems?",
                                        "How often do students engage with all three dimensions in assessments that incorporate uncertain phenomena and problems?",
                                        "Describe the types of assessments that incorporate uncertain phenomena and problems and integrate the three dimensions. Where are they present? Are they always consistent in form and function or do they vary?",
                                        "Consider program design and location of assessments when determining consistency for incorporation of uncertain phenomena or problems and integration of the three dimensions."
                                    ]
                                }
                            }
                         },
                     ]
                 }
            ]
        },
        {
             id: 'gateway2',
             name: 'Gateway 2: Coherence and Scope',
             description: 'Materials are coherent in design, scientifically accurate, and support grade-band endpoints made for all three dimensions.',
             totalPoints: 34,
             ratingThresholds: [20, 28],
             notes: '* NOTE: Indicators 2d-2e are non-negotiable; materials being reviewed must score above zero points in each indicator, otherwise the materials automatically do not proceed to Gateway 3.',
             criterionSections: [
                 {
                     id: 'criterion2.1',
                     name: 'Criterion 2.1: Coherence and Full Scope of the Three Dimensions',
                     description: 'Materials are coherent in design, scientifically accurate, and support grade-band endpoints made for all three dimensions.',
                     items: [
                         { // Indicator Group Example
                             type: 'group',
                             id: 'group-2a', // Unique ID for the group itself (optional, mainly for lookup)
                             name: '2a. Materials provide opportunities for students to fully learn and develop all grade-level Disciplinary Core Ideas.',
                             evidenceGuide: {
                                indicatorName: "Materials provide opportunities for students to fully learn and develop all grade-level Disciplinary Core Ideas.",
                                guidingQuestion: "Do the materials provide opportunities for students to fully learn and develop all grade-level Disciplinary Core Ideas (DCIs)?",
                                purpose: "This indicator examines the materials to determine if all grade-level DCIs and their elements from Physical, Life, and Earth and Space Sciences are included in the materials. It also examines the materials to determine if all grade-band DCIs and their elements from Engineering, Technology, and Applications of Science are included in the materials.",
                                researchConnection: "\"Conclusion 5: Proficiency in science involves having knowledge of facts and concepts as well as how these ideas and concepts are related to each other. Thus, to become more expert in science, students need to learn key ideas and concepts, how they are related to each other, and their implications and applications within the discipline. This entails a process of conceptual development that in some cases involves large-scale reorganization of knowledge and is not a simple accumulation of information. \" (Taking Science to School pp. 338-339)",
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Determine where students develop grade-level understanding (PS, LS, ESS DCIs) and grade-band understanding (ETS DCIs) of each of the DCI elements. Note if the element is fully met, partially met, or not met by the materials.",
                                        "Determine where the full DCI element is taught over the course of multiple learning opportunities, as applicable.",
                                        "Describe the specific examples of learning opportunities that include each DCI element."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How many of the grade-level Physical, Life, and Earth and Space Science DCI elements do the materials incorporate, across the grade band?",
                                        "How many of the grade-band Engineering, Technology, and Applications of Science DCI elements do the materials incorporate?"
                                    ]
                                }
                            },
                             items: [
                                 { 
                                     id: '2a-i', 
                                     name: '2a.i. Physical Sciences', 
                                     scoringOptions: [0, 1, 2], 
                                     scoringCriteria: ['Materials provide opportunities for students to fully learn and develop nearly all associated elements of the grade-level Physical Science DCIs.'], 
                                     isNarrativeOnly: false, 
                                     isNonNegotiable: false,
                                     evidenceGuide: {
                                         scoringDetails: [
                                             {score: 2, text: "Materials provide opportunities for students to fully learn and develop nearly all associated elements of the grade-level Physical Science DCIs."},
                                             {score: 1, text: "Materials provide opportunities for students to fully learn and develop most of the associated elements of the grade-level Physical Science DCIs."},
                                             {score: 0, text: "Materials do not provide opportunities for students to learn and develop numerous associated elements of the grade-level Physical Science DCIs."}
                                         ]
                                     }
                                 },
                                 { 
                                     id: '2a-ii', 
                                     name: '2a.ii. Life Sciences', 
                                     scoringOptions: [0, 1, 2], 
                                     scoringCriteria: ['Materials provide opportunities for students to fully learn and develop nearly all associated elements of the grade-level Life Science DCIs.'], 
                                     isNarrativeOnly: false, 
                                     isNonNegotiable: false,
                                     evidenceGuide: {
                                         scoringDetails: [
                                             {score: 2, text: "Materials provide opportunities for students to fully learn and develop nearly all associated elements of the grade-level Life Science DCIs."},
                                             {score: 1, text: "Materials provide opportunities for students to fully learn and develop most of the associated elements of the grade-level Life Science DCIs."},
                                             {score: 0, text: "Materials do not provide opportunities for students to learn and develop numerous associated elements of the grade-level Life Science DCIs."}
                                         ]
                                     } 
                                 },
                                 { 
                                     id: '2a-iii', 
                                     name: '2a.iii. Earth and Space Sciences', 
                                     scoringOptions: [0, 1, 2], 
                                     scoringCriteria: ['Materials provide opportunities for students to fully learn and develop nearly all associated elements of the grade-level Earth and Space Science DCIs.'], 
                                     isNarrativeOnly: false, 
                                     isNonNegotiable: false,
                                      evidenceGuide: {
                                         scoringDetails: [
                                             {score: 2, text: "Materials provide opportunities for students to fully learn and develop nearly all associated elements of the grade-level Earth and Space Science DCIs."},
                                             {score: 1, text: "Materials provide opportunities for students to fully learn and develop most of the associated elements of the grade-level Earth and Space Science DCIs."},
                                             {score: 0, text: "Materials do not provide opportunities for students to learn and develop numerous associated elements of the grade-level Earth and Space Science DCIs."}
                                         ]
                                     }
                                 },
                                 { 
                                     id: '2a-iv', 
                                     name: '2a.iv. Engineering, Technology, and Applications of Science', 
                                     scoringOptions: [0, 1, 2], 
                                     scoringCriteria: ['Materials provide opportunities for students to fully learn and develop nearly all associated elements of the grade-band Engineering, Technology, and Applications of Science DCIs.'], 
                                     isNarrativeOnly: false, 
                                     isNonNegotiable: false,
                                     evidenceGuide: {
                                         scoringDetails: [
                                             {score: 2, text: "Materials provide opportunities for students to fully learn and develop nearly all associated elements of the grade-band Engineering, Technology, and Applications of Science DCIs."},
                                             {score: 1, text: "Materials provide opportunities for students to fully learn and develop most of the associated elements of the grade-band Engineering, Technology, and Applications of Science DCIs."},
                                             {score: 0, text: "Materials do not provide opportunities for students to learn and develop numerous associated elements of the grade-band Engineering, Technology, and Applications of Science DCIs."}
                                         ]
                                     }
                                 },
                             ]
                         },
                          { // Another group
                             type: 'group',
                             id: 'group-2b',
                             name: '2b. Materials provide opportunities for students to fully learn and develop all grade-band Science and Engineering Practices.',
                             evidenceGuide: {
                                indicatorName: "Materials provide opportunities for students to fully learn and develop all grade-band Science and Engineering Practices.",
                                guidingQuestion: "Do the materials provide opportunities for students to fully learn and develop all grade-level Science and Engineering Practices (SEPs)?",
                                purpose: "This indicator examines the materials to determine if the grade-level appropriate SEPs and their associated elements are included in each grade. It also examines the materials to determine if multiple and repeated opportunities with the grade-level SEPs are provided, if SEPs from outside of the grade-band are included, if the grade-band SEPs and their associated elements are included in the course, and if multiple and repeated opportunities with the grade-band SEPs are provided.",
                                researchConnection: "\"Engaging in the practices of science helps students understand how scientific knowledge develops; such direct involvement gives them an appreciation of the wide range of approaches that are used to investigate, model, and explain the world. Engaging in the practices of engineering likewise helps students understand the work of engineers, as well as the links between engineering and science. Participation in these practices also helps students form an understanding of the crosscutting concepts and disciplinary ideas of science and engineering; moreover, it makes students' knowledge more meaningful and embeds it more deeply into their worldview.” (A Framework for K-12 Science Education, p. 42)",
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "2b.i: Determine when and where students develop and use grade-level appropriate SEPs and their elements. Note if the element is fully met, partially met, or not met by the materials. Determine where the full SEP element is taught over the course of multiple learning opportunities, as applicable. Describe the specific examples of learning opportunities that include each SEP element. Determine how students repeatedly use grade-level appropriate SEPs across various contexts. Detail how the SEPs are organized across the grade (to support the narrative report).",
                                        "2b.ii: Determine when and where students develop and use grade-band appropriate SEPs and their elements. Note if the element is fully met, partially met, or not met by the materials. Determine how students repeatedly use grade-band appropriate SEPs across various contexts. Detail how the SEPs are organized across the grade-band (to support the narrative report)."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "2b.i: How many of the grade-level SEPs and associated elements do the materials incorporate? Do the materials provide repeated opportunities for students to use the grade-level SEPs across various contexts? To what extent do the materials incorporate SEP elements from above or below the grade-level?",
                                        "2b.ii: How many of the grade-band SEPs and associated elements do the materials incorporate? Do the materials provide repeated opportunities for students to use the grade-band SEPs across various contexts? To what extent do the materials incorporate SEP elements from above or below the grade-band?"
                                    ]
                                }
                            },
                             items: [
                                 { 
                                     id: '2b-i', 
                                     name: '2b.i. Materials incorporate grade-level appropriate SEPs within each grade.', 
                                     scoringOptions: [0, 2, 4], 
                                     scoringCriteria: ['Materials provide opportunities for students to fully learn and develop all grade-level SEPs and nearly all associated grade-level elements.', 'Materials consistently provide multiple and repeated opportunities for students to use grade-level SEPs across various contexts.'], 
                                     isNarrativeOnly: false, 
                                     isNonNegotiable: false,
                                      evidenceGuide: {
                                         scoringDetails: [
                                             {score: 4, text: "Materials provide opportunities for students to fully learn and develop all grade-level SEPs and nearly all associated grade-level elements. AND Materials consistently provide multiple and repeated opportunities for students to use grade-level SEPs across various contexts."},
                                             {score: 2, text: "Materials provide opportunities for students to fully learn and develop all grade-level SEPs and most associated grade-level elements. AND Materials provide multiple and repeated opportunities for students to use grade-level SEPs across various contexts, but not consistently."},
                                             {score: 0, text: "Materials do not incorporate all grade-level SEPs within the grade-level. OR Materials do not provide opportunities for students to learn and develop numerous grade-level SEP elements. OR Materials include numerous elements of SEPs from above or below the grade-band without connecting to the grade-level SEPs. OR Materials do not provide multiple and repeated opportunities for students to use grade-level SEPs across various contexts."}
                                         ]
                                     }
                                 },
                                 { 
                                     id: '2b-ii', 
                                     name: '2b.ii. Materials incorporate all SEPs across the grade band.', 
                                     scoringOptions: [0, 2, 4], 
                                     scoringCriteria: ['Materials provide opportunities for students to fully learn and develop all grade-band SEPs and nearly all associated grade-band elements.', 'Materials consistently provide multiple and repeated opportunities for students to use grade-band SEPs across various contexts.'], 
                                     isNarrativeOnly: false, 
                                     isNonNegotiable: false,
                                     evidenceGuide: {
                                         scoringDetails: [
                                             {score: 4, text: "Materials provide opportunities for students to fully learn and develop all grade-band SEPs and nearly all associated grade-band elements. AND Materials consistently provide multiple and repeated opportunities for students to use grade-band SEPs across various contexts."},
                                             {score: 2, text: "Materials provide opportunities for students to fully learn and develop all grade-band SEPs and most associated grade-band elements. AND Materials provide multiple and repeated opportunities for students to use grade-band SEPs across various contexts, but not consistently."},
                                             {score: 0, text: "Materials do not incorporate all grade-band SEPs within the grade-band. OR Materials do not provide opportunities for students to learn and develop numerous grade-band SEP elements. OR Materials include numerous elements of SEPs from above or below the grade-band without connecting to the grade-band SEPs. OR Materials do not provide multiple and repeated opportunities for students to use grade-band SEPs across various contexts."}
                                         ]
                                     }
                                 },
                             ]
                         },
                          {
                             id: '2c',
                             name: '2c. Materials provide opportunities for students to fully learn and develop all grade-band Crosscutting Concepts.',
                             scoringOptions: [0, 4, 8],
                             scoringCriteria: [
                                 'Materials provide opportunities for students to fully learn and develop all grade-band CCCs and nearly all associated grade-band elements.',
                                 'Materials consistently provide multiple and repeated opportunities for students to use grade-band CCCs across various contexts.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide opportunities for students to fully learn and develop all grade-band Crosscutting Concepts.",
                                guidingQuestion: "Do the materials provide opportunities for students to fully learn and develop all grade-band Crosscutting Concepts (CCCs)?",
                                purpose: "This indicator examines the materials to determine if the grade-band CCCs and their associated elements are included in the course. It also examines if multiple and repeated opportunities with the grade-band CCCs are provided and if CCCs from outside of the grade-band are included.",
                                researchConnection: "\"...[Crosscutting concepts] bridge disciplinary boundaries, having explanatory value throughout much of science and engineering. These crosscutting concepts were selected for their value across the sciences and in engineering. These concepts help provide students with an organizational framework for connecting knowledge from the various disciplines into a coherent and scientifically based view of the world.” (A Framework for K-12 Science Education, p. 83)",
                                scoringDetails: [
                                    { score: 8, text: "Materials provide opportunities for students to fully learn and develop all grade-band CCCs and nearly all associated grade-band elements. AND Materials consistently provide multiple and repeated opportunities for students to use grade-band CCCs across various contexts." },
                                    { score: 4, text: "Materials provide opportunities for students to fully learn and develop all grade-band CCCs and most associated grade-band elements. AND Materials provide multiple and repeated opportunities for students to use grade-band CCCs across various contexts, but not consistently." },
                                    { score: 0, text: "Materials do not incorporate all grade-band CCCs within the grade-band. OR Materials do not provide opportunities for students to learn and develop numerous grade-band CCC elements. OR Materials include numerous elements of CCCs from above or below the grade-band without connecting to the grade-band CCCs. OR Materials do not provide multiple and repeated opportunities for students to use grade-band CCCs across various contexts." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Determine when and where students develop and use grade-band appropriate CCCs and their elements. Note if the element is fully met, partially met, or not met by the materials.",
                                        "Determine where the full CCC element is taught over the course of multiple learning opportunities, as applicable.",
                                        "Describe the specific examples of learning opportunities that include each CCC element.",
                                        "Determine how students repeatedly use grade-band appropriate CCCs across various contexts.",
                                        "Detail how the CCCs are organized across the grade-band (to support the narrative report)."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How many of the grade-band CCCs and associated elements do the materials incorporate??",
                                        "Do the materials provide repeated opportunities for students to use the grade-band CCCs across various contexts?",
                                        "To what extent do the materials incorporate CCC elements from above or below the grade-band?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '2d',
                             name: '2d. Materials present Disciplinary Core Ideas (DCIs), Science and Engineering Practices (SEPs), and Crosscutting Concepts (CCCs) in a way that is scientifically accurate.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials consistently present all three dimensions in a scientifically accurate manner.',
                                 'Assessments consistently present all three dimensions in a scientifically accurate manner.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: true,
                             evidenceGuide: {
                                indicatorName: "Materials present Disciplinary Core Ideas (DCIs), Science and Engineering Practices (SEPs), and Crosscutting Concepts (CCCs) in a way that is scientifically accurate.",
                                guidingQuestion: "Do the materials present Disciplinary Core Ideas (DCIs), Science and Engineering Practices (SEPs), and Crosscutting Concepts (CCCs) in a manner that is scientifically accurate?",
                                purpose: "This indicator examines whether materials present DCIs, SEPs, and CCCs in a scientifically accurate manner within learning opportunities. It also examines whether materials present DCIs, SEPs, and CCCs in a scientifically accurate manner within assessments.",
                                researchConnection: "\"...science content standards should be clear, detailed, and complete; reasonable in scope; rigorously and scientifically correct; and based on sound models of student learning.” (A Framework for K-12 Science Education, p. 298)",
                                scoringDetails: [
                                    { score: 2, text: "Materials consistently present all three dimensions in a scientifically accurate manner. AND Assessments consistently present all three dimensions in a scientifically accurate manner." },
                                    { score: 1, text: "Materials contain a few minor errors when presenting DCIs. OR Materials contain a few minor errors when presenting SEPs or CCCs. OR Assessments contain a few minor errors when assessing DCIs, SEPs or CCCs." },
                                    { score: 0, text: "Materials contain major errors in presenting any of the dimensions. OR Materials present any of the dimensions in a scientifically inaccurate manner. OR Assessments present any of the dimensions in a scientifically inaccurate manner." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Determine whether the materials present DCIs, SEPs, CCCs, and associated elements in a scientifically accurate manner.",
                                        "Determine whether assessments present DCIs, SEPs, and CCCs, and associated elements in a scientifically accurate manner.",
                                        "If errors are present, determine what type of error is present. Major errors could lead to student misconceptions that would hinder learning in this grade-band or beyond, including generalizations that oversimplify content beyond making it accessible to the grade-level/band. Minor errors could consist of typos or generalizations that include a presentation of a science topic that oversimplifies the content but would not lead to a major misconception by students and are appropriate for the grade-level/band."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do the materials present each dimension and its elements in a scientifically accurate manner?",
                                        "How often do the assessments present each dimension and its elements in a scientifically accurate manner?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '2e',
                             name: '2e. Materials do not inappropriately include scientific content and ideas outside of the grade-band Disciplinary Core Ideas.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials contain no instances where non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) are included as science ideas.',
                                 'Materials contain few instances where scientific content or ideas are included without meaningful connections to grade-band DCIs.',
                                 'Materials contain no instances of DCIs from below the grade-band that are included without meaningful connections made to the grade-band DCIs.',
                                 'Materials contain no instances of content from beyond the grade-band DCIs that are included without meaningful connections made to the grade-band DCIs.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: true,
                             evidenceGuide: {
                                indicatorName: "Materials do not inappropriately include scientific content and ideas outside of the grade-band Disciplinary Core Ideas.",
                                guidingQuestion: "Do the materials inappropriately include scientific content and ideas outside of the grade-band Disciplinary Core Ideas (DCIs)?",
                                purpose: "This indicator examines whether materials inappropriately include non-scientific content or ideas as science ideas, scientific content or ideas outside of the DCIs as DCIs in science, DCIs from below the grade-band with no meaningful connections to the grade-band DCIs, and content from beyond the grade-band DCIs with no meaningful connections to the grade-band DCIs.",
                                researchConnection: "\"Science is both a body of knowledge that represents current understanding of natural systems and the process whereby that body of knowledge has been established and is being continually extended, refined, and revised. Both elements are essential: one cannot make progress in science without an understanding of both. Likewise, in learning science one must come to understand both the body of knowledge and the process by which this knowledge is established, extended, refined, and revised.\" (Taking Science to School, p. 27)",
                                scoringDetails: [
                                    { score: 2, text: "Materials contain no instances where non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) are included as science ideas. AND Materials contain few instances where scientific content or ideas are included without meaningful connections to grade-band DCIs. AND Materials contain no instances of DCIs from below the grade-band that are included without meaningful connections made to the grade-band DCIs. AND Materials contain no instances of content from beyond the grade-band DCIs that are included without meaningful connections made to the grade-band DCIs." },
                                    { score: 1, text: "Materials contain no instances where non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) are included as science ideas. AND Materials contain few instances where scientific content or ideas are included without meaningful connections to grade-band DCIs. AND/OR Materials contain few instances of DCIs from below the grade-band that are inappropriately included with no meaningful connections to the grade-band DCIs. AND/OR Materials contain few instances of DCIs from beyond the grade-band that are inappropriately included with no meaningful connections to the grade-band DCIs." },
                                    { score: 0, text: "Materials contain multiple instances where non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) are included as science ideas. OR Materials contain multiple instances where scientific content or ideas are included without meaningful connections to grade-band DCIs. OR Materials contain multiple instances of DCIs from below the grade-band that are inappropriately included with no meaningful connections to the grade-band DCIs. OR Materials contain multiple instances of DCIs from beyond the grade-band that are inappropriately included with no meaningful connections to the grade-band DCIs." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Determine whether the materials include non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) as science ideas.",
                                        "Determine whether the materials inappropriately include scientific content or ideas outside of the DCIs.",
                                        "Determine whether the materials inappropriately include DCIs from below the grade-band with no meaningful connections to the grade-band DCIs.",
                                        "Determine whether the materials inappropriately include content from beyond the grade-band DCIs with no meaningful connections to the grade-band DCIs."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Do the materials include non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) as science ideas?",
                                        "Do the materials inappropriately include scientific content or ideas outside of the DCIs?",
                                        "Do the materials inappropriately include DCIs from below the grade-band with no meaningful connections to the grade-band DCIs?",
                                        "Do the materials inappropriately include content from beyond the grade-band DCIs with no meaningful connections to the grade-band DCIs?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '2f',
                             name: '2f. Materials incorporate NGSS Connections to Nature of Science and Engineering.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials incorporate grade-band NGSS Connections to Nature of Science and Engineering within learning opportunities. Elements from all three of the following categories are included in the materials for the grade band: grade-band Nature of Science elements associated with SEPs, grade-band Nature of Science elements associated with CCCs, grade-band Engineering elements associated with CCCs.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials incorporate NGSS Connections to Nature of Science and Engineering.",
                                guidingQuestion: "Do the materials incorporate NGSS Connections to Nature of Science (NOS) and Engineering (ENG)?",
                                purpose: "This indicator examines the materials to determine if NGSS Connections to Nature of Science and Engineering are included in the grade band. This includes Nature of Science elements associated with SEPs, Nature of Science elements associated with CCCs, and Engineering elements associated with CCCs.",
                                researchConnection: "\"...[Crosscutting concepts] bridge disciplinary boundaries, having explanatory value throughout much of science and engineering. These crosscutting concepts were selected for their value across the sciences and in engineering. These concepts help provide students with an organizational framework for connecting knowledge from the various disciplines into a coherent and scientifically based view of the world. “(A Framework for K-12 Science Education, p. 83)",
                                scoringDetails: [
                                    { score: 2, text: "Materials incorporate grade-band NGSS Connections to Nature of Science and Engineering within learning opportunities. Elements from all three of the following categories are included in the materials for the grade band: grade-band Nature of Science elements associated with SEPs, grade-band Nature of Science elements associated with CCCs, grade-band Engineering elements associated with CCCs." },
                                    { score: 1, text: "Materials incorporate grade-band NGSS Connections to Nature of Science and Engineering within learning opportunities. Elements from two of the following categories are included in the materials for the grade band: grade-band Nature of Science elements associated with SEPs, grade-band Nature of Science elements associated with CCCs, grade-band Engineering elements associated with CCCs." },
                                    { score: 0, text: "Materials do not incorporate grade-band NGSS Connections to Nature of Science and Engineering within learning opportunities. Elements from zero or one of the following categories are included in the materials for the grade band: grade-band Nature of Science elements associated with SEPs, grade-band Nature of Science elements associated with CCCs, grade-band Engineering elements associated with CCCs." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Determine where students develop and use the grade-band appropriate elements of NGSS Connections to Nature of Science and Engineering.",
                                        "Describe the specific examples of learning opportunities that include elements of NGSS Connections to Nature of Science and Engineering."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "In how many of the categories do the materials incorporate grade-band NGSS Connections to Nature of Science and Engineering elements? Nature of Science elements associated with SEPs, Nature of Science elements associated with CCCs, Engineering elements associated with CCCs."
                                    ]
                                }
                            }
                         },
                         {
                             id: '2g',
                             name: '2g. Materials support understanding of how the dimensions connect across contexts.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials consistently demonstrate how the dimensions connect across contexts by describing connections for students AND/OR providing support for teachers to help students understand connections.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials support understanding of how the dimensions connect across contexts.",
                                guidingQuestion: "Are the materials designed for students to build and connect their knowledge and use of the three dimensions?",
                                purpose: "This indicator examines whether the materials connect student learning and use of the three dimensions within and/or across learning sequences.",
                                researchConnection: "\"Science concepts build coherently across K–12. The emphasis of the NGSS is a focused and coherent progression of knowledge from grade band to grade band, allowing for a dynamic process of building knowledge throughout a student's entire K–12 science education.” (The Next Generation Science Standards, p. xiii)",
                                scoringDetails: [
                                    { score: 2, text: "Materials consistently demonstrate how the dimensions connect across contexts by describing connections for students AND/OR providing support for teachers to help students understand connections." },
                                    { score: 1, text: "Materials demonstrate how the dimensions connect across contexts by describing connections for students AND/OR providing support for teachers to help students understand connections, but not consistently." },
                                    { score: 0, text: "Materials do not demonstrate how the dimensions connect across contexts." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences in both student and teacher materials.",
                                        "Follow the suggested or intended sequence, if present."
                                    ],
                                    recordEvidence: [
                                        "Describe how the DCIs, SEPs, and/or CCCs connect across contexts.",
                                        "Describe how the materials make clear (to the students and/or teachers to support students) the connections of the three dimensions across learning sequences to connect prior, current, and future learning. Connections should be explicit for students or for teachers to support students. Connections should be related to different 'topics' and a larger grain size than learning opportunity to learning opportunity. Connections are not continuations of learning. Do not identify opportunities for continuation of learning between two sequential learning opportunities."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do the materials demonstrate how the dimensions connect across contexts?",
                                        "How often are connections described explicitly for students?",
                                        "How often are teachers provided support to help students understand connections?",
                                        "How often do the materials describe the connection of the dimensions to teachers without supporting the teacher to make the connections explicit to students?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '2h',
                             name: '2h. Materials are designed for student tasks related to explaining phenomena and/or solving problems to increase in sophistication.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Student tasks related to explaining phenomena and/or solving problems consistently increase in sophistication across the grade-band.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials are designed for student tasks related to explaining phenomena and/or solving problems to increase in sophistication.",
                                guidingQuestion: "Are the materials designed for student tasks related to explaining phenomena and/or solving problems to increase in sophistication?",
                                purpose: "This indicator examines how student tasks related to explaining phenomena and/or solving problems increase in sophistication across the grade-band.",
                                researchConnection: "\"Across units, students encounter the different dimensions of a core idea within different science and engineering practices, and they encounter crosscutting concepts across investigations of different core ideas. Over time, moreover, students' understanding of core ideas and crosscutting concepts develops so that they can be presented with more complex phenomena and design challenges, and their increasing grasp of practice supports their ability to engage with these phenomena and challenges.” (Designing NGSS-Aligned Curriculum Materials, p. 11)",
                                scoringDetails: [
                                    { score: 2, text: "Student tasks related to explaining phenomena and/or solving problems consistently increase in sophistication across the grade-band." },
                                    { score: 1, text: "Student tasks related to explaining phenomena and/or solving problems increase in sophistication across the grade-band, but not consistently." },
                                    { score: 0, text: "Student tasks related to explaining phenomena and/or solving problems increase in sophistication across the grade-band in few to no instances." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the learning sequences in both student and teacher materials.",
                                        "Follow the suggested or intended sequence, if present."
                                    ],
                                    recordEvidence: [
                                        "Describe how student tasks, related to explaining phenomena and/or solving problems, increase in sophistication across the grade-band. This could include removal of supports or scaffolds over time, increase in complexity of tasks, students taking on more responsibility or independence as related to tasks, etc. Tasks must be connected to a phenomena and/or problem.",
                                        "Describe how tasks related to student engagement with the SEPs change over time."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How often do student tasks related to explaining phenomena and/or solving problems increase in sophistication across the grade-band?",
                                        "Are there instances where the materials provide limited opportunities for students to engage with SEPs, and thus miss the opportunity to increase the sophistication of tasks?"
                                    ]
                                }
                            }
                         },
                     ]
                 }
            ]
        },
         {
             id: 'gateway3',
             name: 'Gateway 3: Teacher & Student Supports',
             description: 'Materials support teachers to fully utilize the curriculum, understand the skills and learning of their students, and support a range of learners.',
             totalPoints: 18,
             ratingThresholds: [10, 14],
             criterionSections: [
                 {
                     id: 'criterion3.1',
                     name: 'Criterion 3.1: Teacher Supports',
                     description: 'Materials include opportunities for teachers to effectively plan and utilize with integrity to further develop their own understanding of the content.',
                     items: [
                         {
                             id: '3a',
                             name: '3a. Materials provide teacher guidance with useful annotations and suggestions for how to enact the student materials and ancillary materials, with specific attention to engaging students in figuring out phenomena and solving problems.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials provide comprehensive guidance that will assist teachers in presenting the student and ancillary materials.',
                                 'Materials include sufficient and useful annotations and suggestions that are presented within the context of the specific learning objectives.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide teacher guidance with useful annotations and suggestions for how to enact the student materials and ancillary materials, with specific attention to engaging students in figuring out phenomena and solving problems.",
                                guidingQuestion: "Do the materials provide teacher guidance with useful annotations and suggestions for how to enact the student materials and ancillary materials, with specific attention to engaging students in figuring out phenomena and solving problems?",
                                purpose: "This indicator examines the materials to determine whether they contain teacher guidance with sufficient and useful annotations and suggestions for how to enact the student materials and ancillary materials.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 2, text: "Materials provide comprehensive guidance that will assist teachers in presenting the student and ancillary materials. AND Materials include sufficient and useful annotations and suggestions that are presented within the context of the specific learning objectives." },
                                    { score: 1, text: "Materials provide guidance that will assist teachers in presenting the student and ancillary materials. OR Materials include sufficient and useful annotations and suggestions that are presented within the context of the specific learning objectives." },
                                    { score: 0, text: "Materials do not provide guidance that will assist them in presenting the student and ancillary materials. AND Materials do not include sufficient and useful annotations and suggestions that are presented within the context of the specific learning objectives." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the materials, both print and digital (if available), across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe if and how the materials include overview sections, annotations, narrative information, or other documents that will assist the teacher in presenting the student material and/or ancillary materials.",
                                        "Describe how information and guidance provided by the materials is useful for planning instruction. Look for suggestions about instructional strategies and guidance for presenting the content (specifically how to support students in figuring out phenomena and/or solving problems), which could include identifying and addressing student naive conceptions. These are often in the planning sections as well as margin notes, but could also be in the front matter philosophy, professional development, or explanations of program components."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How are the materials structured to provide information that will assist the teacher in presenting the student material or ancillary materials?",
                                        "How do the materials provide specific guidance to plan instruction and support students in the content (specifically how to support students in figuring out phenomena and/or solving problems)?",
                                        "How do the materials support teachers in understanding what students should understand about the targeted phenomenon or problem?",
                                        "Where do the teacher materials explicitly state the phenomenon or problem that is the focus of the student learning?",
                                        "Where do the teacher materials provide explanations to the teacher for how the phenomenon or problem is connected to the dimensions (including engineering and nature of science elements) targeted in the instruction?",
                                        "How well do the materials support teachers in helping students make the connections between the phenomenon or problem, the instructional activities and the three dimensions?"
                                    ]
                                }
                            }
                         },
                          {
                             id: '3b',
                             name: '3b. Materials contain explanations and examples of grade-level/course-level concepts and/or standards and how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials contain explanations and examples of grade/course-level concepts and/or standards so that teachers can improve their own knowledge of the subject.',
                                 'Materials contain explanations and examples of how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials contain explanations and examples of grade-level/course-level concepts and/or standards and how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject.",
                                guidingQuestion: "Do the materials contain explanations and examples of grade/course-level concepts and how the concepts align with other grade/course levels so that teachers can improve their own knowledge of the subject?",
                                purpose: "This indicator examines the materials to determine whether they deepen teacher understanding of science and engineering ideas, concepts, and practices so that teachers can improve their own knowledge of the subject.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 2, text: "Materials contain explanations and examples of grade/course-level concepts and/or standards so that teachers can improve their own knowledge of the subject. AND Materials contain explanations and examples of how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject." },
                                    { score: 1, text: "Materials contain explanations and examples of grade/course-level concepts and/or standards so that teachers can improve their own knowledge of the subject. OR Materials contain explanations and examples of how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject." },
                                    { score: 0, text: "Materials do not contain explanations and examples of grade/course-level concepts and/or standards so that teachers can improve their own knowledge of the subject. AND Materials do not contain explanations and examples of how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the materials, both print and digital (if available), across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe if and how the materials provide explanations and examples that support the teacher in developing their own understanding of the content and expected student practices.",
                                        "Describe if and how the materials provide explanations and examples of how the concepts/standards connect to other grade/course levels."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Where do the teacher materials provide background content knowledge that is accurate, understandable, and gives true assistance to all educators using the materials?",
                                        "Where are supports provided for teachers to understand how current content connects to other grade/course levels?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3c',
                             name: '3c. Materials include standards correlation information, including connections to college- and career-ready ELA and mathematics standards.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Correlation information is present for the science standards addressed throughout the grade level/series.',
                                 'Correlation information and explanations of the role of the specific grade-level/grade-band ELA and mathematics standards are present in the context of the series.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials include standards correlation information, including connections to college- and career-ready ELA and mathematics standards, that explains the role of the standards in the context of the overall series.",
                                guidingQuestion: "Do the materials include standards correlation information, including connections to college- and career-ready ELA and mathematics standards, that explains the role of the standards in the context of the overall series?",
                                purpose: "This indicator examines whether materials provide documentation of how each lesson and unit correlate to the NGSS and Common Core State Standards for ELA and Mathematics and whether materials provide explanations of the role of the standards at each unit/module in the context of the overall series.",
                                researchConnection: "\"Recommendation 12: The standards for the sciences and engineering should align coherently with those for other K-12 subjects. Alignment with the Common Core Standards in mathematics and English/language arts is especially important.\" (A Framework for K-12 Science Education, p. 306)",
                                scoringDetails: [
                                    { score: 2, text: "Correlation information and explanations of the role of the specific grade-level/grade-band science standards are present in the context of the series. AND Correlation information and explanations of the role of the specific grade-level/grade-band ELA and mathematics standards are present in the context of the series." },
                                    { score: 1, text: "Correlation information and explanations of the role of the specific grade-level/grade-band science standards are present in the context of the series, but not consistently. OR Correlation information and explanations of the role of the specific grade-level/grade-band ELA or mathematics standards are present, but not consistently." },
                                    { score: 0, text: "Correlation information and explanations of the role of the specific grade-level/grade-band science standards are not present. OR Correlation information and explanations of the role of the specific grade-level/grade-band ELA or mathematics standards are not present." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the print and digital (if available) table of contents, pacing guides, scope and sequence, and other teacher materials."
                                    ],
                                    recordEvidence: [
                                        "Describe how and where teacher materials provide NGSS standards correlations for science. Note at what level (unit, lesson, activity) these correlations are provided.",
                                        "Describe how and where teacher materials provide an explanation for the role of these NGSS standards in the context of the overall series. Note at what level (unit, lesson, activity) these explanations are provided.",
                                        "Describe how and where teacher materials provide standards correlation information to applicable Common Core ELA and Mathematics Standards. Note at what level (unit, lesson, activity) these correlations are provided.",
                                        "Describe how and where teacher materials provide an explanation for the role of these Common Core ELA and Mathematics Standards in the context of the overall series. Note at what level (unit, lesson, activity) these explanations are provided.",
                                        "Note: if standards correlation is inaccurate.",
                                        "Note: if information is included to allow the teacher to make prior connections and teach for connections to future content."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How and where do materials provide accurate documentation of how units, lessons, or activities align to NGSS standards?",
                                        "How and where do materials provide accurate documentation of how units, lessons, or activities align to applicable Common Core ELA and Mathematics standards?",
                                        "How and where do materials provide an explanation of the role identified standards play in the context of the overall series?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3d',
                             name: '3d. Materials provide strategies for informing all stakeholders, including students, parents, or caregivers about the program and suggestions for how they can help support student progress and achievement.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Materials contain strategies for informing students, parents, or caregivers about the program.',
                                 'Materials contain suggestions for how parents or caregivers can help support student progress and achievement.',
                                 'Materials for parents and caregivers (like letters home) have been translated into languages other than English.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide strategies for informing all stakeholders, including students, parents, or caregivers about the program and suggestions for how they can help support student progress and achievement.",
                                guidingQuestion: "Do the materials provide strategies for informing all stakeholders, including students, parents, or caregivers about the program and suggestions for how they can help support student progress and achievement?",
                                purpose: "This indicator examines the series to determine if the materials contain strategies for informing students, parents, or caregivers about the program, and it also examines the series to determine if the materials contain suggestions for how parents or caregivers can help support student progress and achievement.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Look at both print and digital (if available) student materials and teacher materials, including beginning sections of the entire course, unit, chapter, or lesson that contains overview sections, teacher instruction pages, or ancillary supports for a narrative explanation of the content in each topic, paying attention to key instruction that will inform others that may be assisting the student's progress."
                                    ],
                                    recordEvidence: [
                                        "Describe where the materials contain strategies for informing students, parents, or caregivers about the science program. Look for forms of communication with parents and caregivers, including for families that may speak and read in a language other than English.",
                                        "Describe where the materials contain suggestions for how parents or caregivers can help support student progress and achievement. Look for any work that notes a school-to-home connection."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Where do the materials contain overview sections, teacher instruction pages, or ancillary supports that contain strategies for informing students, parents, or caregivers about the science program, including for families that may speak and read a language other than English?",
                                        "Where do the materials contain overview sections, teacher instruction pages, or ancillary supports that contain suggestions for how parents or caregivers can help support student progress and achievement?"
                                    ]
                                }
                            }
                         },
                          {
                             id: '3e',
                             name: '3e. Materials provide explanations of the instructional approaches of the program, identify the research-based strategies, and explain the role of the standards.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials explain the instructional approaches of the program.',
                                 'Materials include and reference research-based strategies.',
                                 'Materials include and reference the role of the standards in the program.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                              evidenceGuide: {
                                indicatorName: "Materials provide explanations of the instructional approaches of the program and identification of the research-based strategies.",
                                guidingQuestion: "Do the materials provide explanations of the instructional approaches of the program and identification of the research-based strategies?",
                                purpose: "This indicator examines the materials to determine whether they explain the instructional approaches of the program and whether they identify research-based strategies that have informed the design of the materials.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 2, text: "Materials explain the instructional approaches of the program. AND Materials include and reference research-based strategies." },
                                    { score: 1, text: "Materials explain the instructional approaches of the program. OR Materials include and reference research-based strategies." },
                                    { score: 0, text: "Materials do not explain the instructional approaches of the program. AND Materials do not include and reference research-based strategies." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how and where the materials explain the instructional approaches of the program.",
                                        "Describe how and where the materials identify research-based strategies that are used in the design."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Where and how well do the materials explain the instructional approaches of the program?",
                                        "Where and how well do the materials identify research-based strategies used in and throughout the program?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3f',
                             name: '3f. Materials provide a comprehensive list of supplies needed to support instructional activities.',
                             scoringOptions: [0, 1],
                             scoringCriteria: [
                                 'Materials include a comprehensive list of supplies needed to support the instructional activities.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                              evidenceGuide: {
                                indicatorName: "Materials provide a comprehensive list of supplies needed to support instructional activities.",
                                guidingQuestion: "Do the materials provide a comprehensive list of supplies needed to support instructional activities?",
                                purpose: "This indicator examines the series to determine if the materials contain a comprehensive list of materials needed to support implementation.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 1, text: "Materials include a comprehensive list of supplies needed to support the instructional activities." },
                                    { score: 0, text: "Materials do not include a comprehensive list of supplies needed to support instructional activities." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Determine whether a comprehensive list of required materials is provided."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Does the series provide a comprehensive list of required materials? At what level(s) is the support provided (course, unit/module, lesson, etc.)?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3g',
                             name: '3g. The assessment system provides consistent opportunities to determine student learning throughout the school year. The assessment system provides sufficient teacher guidance for evaluating student performance and determining instructional next steps.',
                             scoringOptions: [0, 2, 4],
                             scoringCriteria: [
                                 'The assessment system consistently provides opportunities to determine student learning throughout the school year.',
                                 'The assessment system consistently provides sufficient teacher guidance for evaluating student performance.',
                                 'The assessment system consistently provides sufficient teacher guidance for interpreting student performance and determining next instructional steps.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                              evidenceGuide: {
                                indicatorName: "The assessment system provides consistent opportunities to determine student learning throughout the school year. The assessment system provides sufficient teacher guidance for evaluating student performance and determining instructional next steps.",
                                guidingQuestion: "Does the assessment system provide consistent opportunities to determine student learning throughout the school year? Does the assessment system provide sufficient teacher guidance for interpreting student performance and determining instructional next steps?",
                                purpose: "This indicator examines assessments and corresponding assessment guidance across the series, including answer keys, rubrics, and other assessment scoring tools (e.g., sample student responses, scoring guidelines, and open-ended feedback), guidance for teachers to interpret student performance, and suggestions for follow-up based on student performance.",
                                researchConnection: "\"It is possible to design assessment tasks and scoring rubrics that assess three-dimensional science learning. Such assessments provide evidence that informs teachers and students of the strengths and weaknesses of a student's current understanding, which can guide further instruction and student learning and can also be used to evaluate students' learning.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, conclusion 4-3, p. 130)",
                                scoringDetails: [
                                    { score: 4, text: "The assessment system consistently provides opportunities to determine student learning throughout the school year. AND The assessment system consistently provides sufficient teacher guidance for evaluating student performance. AND The assessment system consistently provides sufficient teacher guidance for interpreting student performance and determining next instructional steps." },
                                    { score: 2, text: "The assessment system provides opportunities to determine student learning throughout the school year, but not consistently. OR The assessment system provides sufficient teacher guidance for evaluating student performance, but not consistently. OR The assessment system provides sufficient teacher guidance for interpreting student performance and determining next instructional steps, but not consistently." },
                                    { score: 0, text: "The assessment system provides few to no opportunities to determine student learning throughout the school year. OR The assessment system provides sufficient teacher guidance for evaluating student performance, giving feedback, and determining instructional next steps, in few to no instances. OR The assessment system provides sufficient teacher guidance for interpreting student performance and determining next instructional steps, in few to no instances." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review assessments and corresponding assessment guidance across the series, including answer keys, rubrics, and other assessment scoring tools."
                                    ],
                                    recordEvidence: [
                                        "Describe if and how assessments provide teacher guidance for evaluating student performance including tools for scoring purposes (e.g., sample student responses, rubrics, scoring guidelines, and open-ended feedback).",
                                        "Describe whether teachers are provided with guidance to interpret student understanding and respond to student needs elicited by the assessment. Record evidence about suggestions provided for the teacher to support them in determining next instructional steps (e.g., support to interpret responses, guidance on common incorrect answers, reasons why students might answer incorrectly, suggestions on possible areas to review or additional instruction)."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How and where do the materials provide tools to score assessment items?",
                                        "How often is guidance provided to teachers to evaluate student understanding?",
                                        "How and where do the materials provide support for interpreting student performance and determining next instructional steps?",
                                        "How often is guidance provided to teachers to interpret student performance and determine next instructional steps ?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3h',
                             name: '3h. Materials provide clear science safety guidelines for teachers and students across the instructional materials.',
                             scoringOptions: [0, 1],
                             scoringCriteria: [
                                 'Materials embed clear science safety guidelines for teachers and students across the instructional materials.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide clear science safety guidelines for teachers and students across the instructional materials.",
                                guidingQuestion: "Do the materials provide clear science safety guidelines for teachers and students across the instructional materials?",
                                purpose: "This indicator examines the series to determine if the materials embed clear science safety guidelines for teacher and students across the instructional materials.",
                                researchConnection: "“Teachers also need opportunities to develop the knowledge and practices to support these investigations, including how to prepare, organize, and maintain materials; implement safety protocols; organize student groups; and guide students as they collect, represent, analyze, discuss data, argue from evidence, and draw conclusions [80].” (A Framework for K-12 Science Education, p. 258)",
                                scoringDetails: [
                                    { score: 1, text: "Materials embed clear science safety guidelines for teachers and students across the instructional materials." },
                                    { score: 0, text: "Materials do not embed science safety guidelines for teachers and students across the instructional material." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how and where the materials embed clear science safety guidelines for teachers and students."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How and where do the materials embed clear science safety guidelines for teachers and students?",
                                        "Are the guidelines present across the materials?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3i',
                             name: '3i. Materials designated for each grade are feasible and flexible for one school year.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Materials designated for each grade are feasible and flexible for one school year.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials designated for each grade are feasible and flexible for one school year.",
                                guidingQuestion: "Are the materials designated for each grade feasible and flexible for one school year?",
                                purpose: "This indicator examines the materials to determine if the amount of time suggested in the materials for each grade is appropriate for a school year, if the expectations of the materials are reasonable for both teachers and students to complete in the suggested timeframe, and if the materials provide guidance to adjust to fit a range of instructional times or different schedules.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the materials across the series, including the table of contents, any pacing guides, and scope and sequence provided by the publisher."
                                    ],
                                    recordEvidence: [
                                        "Describe how the materials within each lesson or unit allow students to learn at an appropriate pace for the given grade level.",
                                        "Identify whether students should be able to master all the content designated for the grade level.",
                                        "(K-5 only) Describe how the materials provide guidance on adjustments to fit districts with different needs based on time restrictions, including rationale on what can be cut, including tradeoffs and how materials provide support for adjusting to fit different schedules and blocks available for teaching science.",
                                        "Describe how the materials are designed with an intentional sequence or suggested sequence and/or guidance on how to intentionally sequence (when modular in design).",
                                        "Note: If the publishers do not provide recommended pacing or structure, assume 1/3 of the materials for a grade band constitute one year."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Do the materials within each lesson or unit allow students to learn at an appropriate pace for the given grade level?",
                                        "Will students be able to master all of the content designated for the grade level?",
                                        "Do the materials provide guidance to adjust for a range of district constraints (time and scheduling)?",
                                        "Are the materials designed with an intentional sequence or suggested sequence and/or guidance on how to intentionally sequence (when modular in design)?"
                                    ]
                                }
                            }
                         },
                     ]
                 },
                 {
                     id: 'criterion3.2',
                     name: 'Criterion 3.2: Student Supports',
                     description: 'Materials are designed for each child\'s regular and active participation in grade-level/grade-band/series content.',
                     items: [
                         {
                             id: '3j',
                             name: '3j. Materials provide strategies and supports for students in special populations to work with grade-level content and meet or exceed grade-level standards, which support their regular and active participation in learning grade-level/band science and engineering.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials regularly provide strategies, supports, and resources for students in special populations to support their regular and active participation and engagement in grade-level/grade-band science and engineering.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide strategies and supports for students in special populations to support their regular and active participation in learning grade-level/grade-band science and engineering.",
                                guidingQuestion: "What opportunities are there for students in special populations to engage with materials to support ongoing participation in grade-level/grade-band science and engineering content?",
                                purpose: "This indicator examines whether the materials provide strategies, supports, and resources for students in special populations to support their regular and active participation in grade-level/grade-band science and engineering.",
                                researchConnection: "For this indicator, special populations refers to students that must overcome barriers that may require special consideration and attention to ensure equal opportunity for success and in an educational setting. This could include: Disabilities: Physical, developmental, behavioral, or emotional disabilities; Economic disadvantage: Low-income families, homelessness, or out-of-workforce individuals; Other circumstances: Preparing for non-traditional fields, single parents, English language learners, or racial and ethnic minorities.",
                                scoringDetails: [
                                    { score: 2, text: "Materials regularly provide strategies, supports, and resources for students in special populations to support their regular and active participation and engagement in grade-level/grade-band science and engineering." },
                                    { score: 1, text: "Materials do not regularly provide strategies, supports, and resources for students in special populations to support their regular and active participation and engagement in grade-level/grade-band science and engineering." },
                                    { score: 0, text: "There are no strategies, supports, or resources for students in special populations to support their regular and active participation and engagement in grade-level/grade-band science and engineering." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher and student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe where and how the materials provide specific strategies and supports for differentiating instruction to meet the needs of students in special populations.",
                                        "Identify whether the materials support students in special populations in regular and active participation in grade-level/grade-band science and engineering and include any instances where differentiation does not present opportunities to engage students in the work of the grade level/grade band.",
                                        "Note: There must be more than a statement at the beginning of the chapter or lesson that is generic or states that the same strategy could be used with every lesson."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How and where do materials provide appropriate differentiated strategies and supports for students in special populations?",
                                        "Do materials provide differentiation supports to sufficiently engage students in grade level/grade band science and engineering?",
                                        "Do the materials include overarching guidance on strategies and accommodations for special populations? Are these evident in lessons?"
                                    ]
                                }
                            }
                         },
                          {
                             id: '3k',
                             name: '3k. Materials regularly provide extensions and/or opportunities for students to engage in learning grade-level/band science and engineering at greater depth.',
                             scoringOptions: [0, 1, 2],
                             scoringCriteria: [
                                 'Materials regularly provide multiple extensions and/or opportunities for advanced students to engage in grade-level/grade-band science at a greater depth.',
                                 'No instances of advanced students doing more assignments than their classmates.',
                             ],
                             isNarrativeOnly: false,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide extensions and/or opportunities for students to engage in learning grade-level/grade-band science and engineering at greater depth.",
                                guidingQuestion: "What opportunities are present for students to engage in learning with grade-level/grade-band science and engineering at higher levels of complexity? Are the opportunities that are present purposeful investigations or extensions? Do the opportunities extend learning of the grade-level content or topic?",
                                purpose: "This indicator examines the materials to determine whether the materials provide opportunities for advanced students to engage in grade-level/grade-band science at a higher level of complexity.",
                                researchConnection: "\"Arguably, the most pressing challenge facing U.S. education is to provide all students with a fair opportunity to learn.\" (A Framework for K-12 Science Education, p. 282)",
                                scoringDetails: [
                                    { score: 2, text: "Materials provide multiple opportunities for advanced students to engage in grade-level/grade-band science at a higher level of complexity. AND No instances of advanced students doing more assignments than their classmates." },
                                    { score: 1, text: "Materials provide some opportunities for advanced students to engage in grade-level/grade-band science at a higher level of complexity. AND There are few instances of advanced students doing more assignments than their classmates." },
                                    { score: 0, text: "Materials provide few, if any, opportunities for advanced students to engage in grade-level/grade-band science at a higher level of complexity. OR There are many instances of advanced students doing more assignments than their classmates." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review the student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how and where advanced students have opportunities to work at a higher level of complexity with the three dimensions to make sense of phenomena and design solutions to problems. Note - this is not students completing additional tasks or more work, but is an extension of their learning.",
                                        "Identify strategies and supports for advanced students to explore grade-level/grade-band content at a higher level of complexity."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Where and how do the materials present opportunities specific to extending students' learning of the grade-level/grade-band content?",
                                        "Where and how do the materials present opportunities to students to engage in grade-level/grade-band content at higher level of complexity?",
                                        "What opportunities do students have to develop and apply higher-level thinking?",
                                        "What strategies and supports are available for students to engage in grade-level/grade-band content at a higher level of complexity?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3l',
                             name: '3l. Materials provide varied approaches to learning tasks over time and variety in how students are expected to demonstrate their learning with opportunities for students to monitor their learning.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Materials provide varied tasks for students to show their thinking and make meaning.',
                                 'Students have opportunities to share their thinking, to demonstrate changes in their thinking over time, and to apply their understanding in new contexts.',
                                 'Materials leverage the use of a variety of formats over time to deepen student understanding and ability to explain and apply literacy ideas.',
                                 'Materials provide for ongoing review, practice, self-reflection, and feedback. Materials provide multiple strategies, such as oral and/or written feedback, peer or teacher feedback, and self-reflection.',
                                 'Materials provide a clear path for students to monitor and move their own learning.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide varied approaches to learning tasks over time and variety in how students are expected to demonstrate their learning with opportunities for students to monitor their learning.",
                                guidingQuestion: "What approaches to presentation of material are provided? What approaches are provided for students to demonstrate their learning? Do the approaches to presentation and demonstration of learning vary over the course of the year?",
                                purpose: "This indicator examines the materials for a variety of approaches to learning tasks over the grade level and grade band, a variety of opportunities for students to demonstrate their learning over time, opportunities for students to receive oral and/or written peer or teacher feedback, and opportunities for students to monitor and move their learning.",
                                researchConnection: "\"For students who need to take more time to express their understanding (e.g., if they learned English as their second language), opportunities to edit or to display their knowledge in less language-embedded tasks would help level the playing field.” (A Framework for K-12 Science Education, p. 289)",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher and student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how and where the materials provide multi-modal opportunities for students to question, investigate, sense-make, and problem-solve using a variety of formats and methods.",
                                        "Describe how and where students have opportunities to share their thinking, to demonstrate changes in their thinking over time, and to apply their understanding in new contexts.",
                                        "Describe how the program leverages the use of a variety of formats and methods over time to deepen student understanding and ability to explain and apply science ideas.",
                                        "Describe if and how materials provide for ongoing review, practice, self-reflection, and feedback.",
                                        "Describe if and how materials provide multiple strategies, such as oral and/or written feedback, peer or teacher feedback, and self-reflection.",
                                        "Describe if and how materials provide a clear path for students to monitor and move their own learning."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How and where do the materials provide multi-modal opportunities for students to share their thinking, ask questions, investigate, make sense of phenomena, and problem-solve using a variety of formats and methods?",
                                        "How and where do students have opportunities to share their thinking, to compare their thinking with other students or to new ideas presented in the learning opportunities, to demonstrate changes in their thinking over time, and to apply their understanding in new contexts?",
                                        "Where and how often do the materials provide for ongoing review, practice, self-reflection, and feedback?",
                                        "Where and how often do the materials provide guidance for multiple feedback strategies, such as oral and/or written feedback?",
                                        "Where and how often do the materials provide guidance for multiple strategies for peer or teacher feedback?",
                                        "Where and how often do the materials encourage students to monitor their own progress based on feedback and self-reflection?",
                                        "Where and how often do the materials provide a clear path for students to monitor and move their own learning?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3m',
                             name: '3m. Materials provide opportunities for teachers to use a variety of grouping strategies.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Materials provide grouping strategies for students.',
                                 'Materials provide guidance for varied types of interaction among students.',
                                 'Materials provide guidance for the teacher on grouping students in a variety of grouping formats.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide opportunities for teachers to use a variety of grouping strategies.",
                                guidingQuestion: "Do the materials provide opportunities for teachers to use a variety of grouping strategies?",
                                purpose: "This indicator examines the materials to determine the types and frequency of grouping strategies for teachers to use and to determine if guidance is provided to teachers on how and when to use specific grouping strategies.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher and student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how and where the materials provide grouping strategies for students.",
                                        "Describe how and where the materials provide for interaction among students and the types of interactions provided.",
                                        "Describe how and where the materials provide guidance for the teacher on grouping students in a variety of grouping formats.",
                                        "Note: If you identify grouping strategies specifically targeted to differentiated populations, please assign that evidence to the associated indicators (special populations will be in 3j; advanced students in 3k; MLL learners in 3m.MLL)."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How and where do materials provide different grouping strategies? How does this differ based on the needs of particular students?",
                                        "How and where do materials balance whole group, small group, and individual instruction to provide for interaction among students?",
                                        "How and where do the materials provide guidance for the teacher on how and when to use specific grouping strategies?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3n',
                             name: '3n. Assessments offer accommodations that allow students to demonstrate their knowledge and skills without changing the content of the assessment.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Materials offer accommodations that ensure all students can access the assessment (e.g., text-to-speech, increased font size) without changing its content.',
                                 'Materials include guidance for teachers on the use of provided accommodations.',
                                 'Materials include guidance for teachers about who can benefit from these accommodations.',
                                 'Materials do not include modifications to assessments that alter grade level/expectations.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Assessments offer accommodations that allow students to demonstrate their knowledge and skills without changing the content of the assessment.",
                                guidingQuestion: "Do the assessments offer accommodations that allow students to demonstrate their knowledge and skills without changing the content of the assessment?",
                                purpose: "This indicator examines the series' assessments and assessment guidance documentation to determine what accommodations are available.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review assessments and corresponding assessment guidance across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe where and how accommodations are offered that ensure all students can access the assessment, (e.g. text-to-speech, increased font size, etc.) without changing the content of the assessment.",
                                        "Describe any guidance for teachers on the use of provided accommodations.",
                                        "Describe whether any accommodations alter grade-level/course expectations or the content of the assessment for students."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Where and how do the assessments provide accommodations for students?",
                                        "Where and how is guidance provided for teachers to use the accommodations?",
                                        "Do accommodations alter grade-level/course expectations for students?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3o',
                             name: '3o. Materials provide a range of representation of people and include detailed instructions and support for educators to effectively incorporate and draw upon students\' different cultural, social, and community backgrounds to enrich learning experiences.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Materials provide a range of representation of people, ensuring a broad range of cultural, racial, gender, and ability backgrounds are accurately and authentically represented.',
                                 'Materials provide detailed instructions and support for teachers on incorporating and drawing upon students\' different cultural, social, and community backgrounds to enrich learning experiences.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                              evidenceGuide: {
                                indicatorName: "Materials provide a range of representation of people and include detailed instructions and support for educators to effectively incorporate and draw upon students' different cultural, social, and community backgrounds to enrich learning experiences.",
                                guidingQuestion: "Do the materials provide guidance and a range of representation of people that supports educators in leveraging students' cultural, social, and community backgrounds to enhance learning?",
                                purpose: "This indicator examines whether materials reflect diverse identities, connect learning to real-world and culturally relevant contexts, and promote student engagement through authentic representation, high expectations, and community involvement. In doing so, the indicator supports communities in engaging in deep discourse and aligning educational practices with their local contexts.",
                                researchConnection: "In 2022, EdReports conducted a landscape analysis of 15 different resources to help educators understand trends and best practices in culturally responsive education, highlighting ongoing efforts and areas for improvement in providing adequate support for culturally relevant instruction.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher and student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how the materials reflect and affirm the diverse identities of students, ensuring a broad range of cultural, racial, gender, and ability backgrounds are accurately and authentically represented.",
                                        "Describe images and representations that depict students actively participating in learning experiences that are connected to real-world contexts. These should include diverse identities of students collaborating, problem-solving, or exploring concepts in ways that highlight their cultural and personal identities. Explicitly note if these images show students of different backgrounds in leadership roles, working together in a variety of group settings, and utilizing culturally relevant tools or methods.",
                                        "Describe specific examples where instructional content is linked to students' cultural experiences, interests, or community knowledge, fostering a deeper engagement and understanding of (Mathematics, ELA, or Science).",
                                        "Identify instructional guidance that encourages high expectations for all students, including those that differentiate learning to meet diverse cultural needs while maintaining academic rigor.",
                                        "Identify prompts that invite students to draw from their cultural backgrounds and personal experiences, enhancing their connection to the material and fostering a deeper sense of identity within the learning environment.",
                                        "Describe any other teacher materials that include guidance on how to actively involve community and family perspectives, drawing on local knowledge and cultural practices to enrich the learning experiences and promote students' role as contributors to their communities."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Do the materials include a wide range of student identities represented, reflecting the diversity of the classroom and broader society? Do these portrayals challenge stereotypes and offer diverse narratives that contribute to an inclusive learning environment?",
                                        "How and where does instructional guidance actively connect to students' cultural knowledge and lived experiences, promoting meaningful learning?",
                                        "How and where do materials include specific strategies to ensure that all students have the opportunity to engage deeply with the content, regardless of their cultural background? Do these strategies enhance the relevance of classroom content by drawing on the experiences, values, and resources of students' families and communities?",
                                        "How often do materials include adaptable approaches that cater to different cultural contexts?"
                                    ]
                                }
                            }
                         },
                          {
                             id: '3p',
                             name: '3p. Materials provide supports for different reading levels to ensure accessibility for students.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Materials identify strategies to engage students in reading and accessing grade-level/grade-band science.',
                                 'Materials identify multiple entry points to help struggling readers access and engage in grade-level/grade-band science.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide supports for different reading levels to ensure accessibility for students.",
                                guidingQuestion: "Do the materials provide supports for different reading levels to ensure accessibility for students?",
                                purpose: "This indicator examines the materials to determine if supports are present for a range of student reading levels to work with grade-level/grade-band science and engineering and to determine if the materials indicate the reading levels for informational text-based components.",
                                researchConnection: "\"Students' preparation in other subjects, especially literacy and mathematics, also affects their achievement in science. If some groups of students fail to become effective readers and writers by late elementary school, teachers have difficulty helping them to make progress—not only in science but also across all subject areas. These students fall further behind, and the problem for teachers grows more complex and challenging. Such dynamics can, in effect, reinforce the low-expectation tracking of students as they move through school, thereby significantly reducing their access to science and engineering pathways through K-12 and limiting the possibility of their going to college.\" (A Framework for K-12 Science Education, p. 279)",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher and student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how and where the materials provide all students, including those who read, write, speak, or listen below grade level, opportunities to work with grade-level text.",
                                        "Describe whether materials provide the reading levels for informational text components."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How and where do the materials include specific supports or strategies to modify lessons or activities for students who read, write, speak, or listen below grade level?",
                                        "Where do the materials provide scaffolds or supports to support academic and/or disciplinary vocabulary or concept development?",
                                        "Do the materials provide teachers and students with purposeful and targeted activities for learning how to read typical scientific texts, for example, identifying evidence?",
                                        "Do materials include “just-right\" pre-reading activities that offer visuals and other types of supports and scaffolds for building essential and pertinent background knowledge on new or unfamiliar themes/ topics?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3q',
                             name: '3q. This is not an assessed indicator in Science.',
                             scoringOptions: [], // Narrative Only (but really N/A)
                             scoringCriteria: [],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "This is not an assessed indicator in Science.",
                                guidingQuestion: "",
                                purpose: "",
                                researchConnection: "",
                                scoringDetails: [],
                                evidenceCollection: {
                                    locationsToReview: [],
                                    recordEvidence: []
                                },
                                clusterMeeting: {
                                    questions: []
                                }
                            }
                         }
                     ]
                 },
                 {
                     id: 'criterion3.3',
                     name: 'Criterion 3.3: Intentional Design',
                     description: 'Materials include a visual design that is engaging and references or integrates digital technology, when applicable, with guidance for teachers.',
                     items: [
                         {
                             id: '3r',
                             name: '3r. Materials integrate technology such as interactive tools, virtual manipulatives/objects, and/or dynamic software in ways that engage students in the grade-level/series standards, when applicable.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Digital technology and interactive tools, such as data collection tools and/or modeling tools are available to students.',
                                 'Digital tools support student engagement in mathematics.', // This might be ELA/Math specific? Keeping as-is from original.
                                 'Digital materials can be customized for local use (i.e., student and/or community interests).',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials integrate interactive tools and/or dynamic software in ways that support student engagement in the three dimensions, when applicable.",
                                guidingQuestion: "Do the materials integrate interactive tools and/or dynamic software in ways that support student engagement in the three dimensions, when applicable?",
                                purpose: "This indicator examines whether materials integrate interactive tools and/or dynamic software in ways that support student engagement in the three dimensions of science and is applicable to materials with digital components only.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher and student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe if and how digital technology and interactive tools, such as data collection tools, simulations, and/or modeling tools are available to students.",
                                        "Describe if and how included digital tools support student engagement in the three dimensions of science.",
                                        "Describe if and how digital materials can be customized for local use (i.e., to embed local phenomena and problems)."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "What digital technology and interactive tools are included in the materials?",
                                        "How are digital technology and interactive tools, such as data collection tools, simulations, and/or modeling tools made available to students?",
                                        "How do included digital tools support student engagement in the three dimensions of science?",
                                        "How can digital materials be customized for local use (i.e., student and/or community interests)?"
                                    ]
                                }
                            }
                         },
                          {
                             id: '3s',
                             name: '3s. Materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other, when applicable.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other, when applicable.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                              evidenceGuide: {
                                indicatorName: "Materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other, when applicable.",
                                guidingQuestion: "Do the materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other, when applicable?",
                                purpose: "This indicator examines the series to determine if the materials provide opportunities and guidance for teachers and/or students to collaborate with each other and is applicable to materials with digital components only.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher and student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how and where the materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other.",
                                        "Describe which stakeholders the materials support collaboration between: teacher to teacher, teacher to student, or student to student."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "How and where do the materials provide opportunities for online or digital collaboration?",
                                        "How and where do the materials provide opportunities for students to collaborate with the teacher and/or with other students?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3t',
                             name: '3t. The visual design (whether in print or digital) supports students in engaging thoughtfully with the subject, and is neither distracting nor chaotic.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Images, graphics, and models support student learning and engagement without being visually distracting. They also clearly communicate information or support student understanding of topics, texts, or concepts.',
                                 'Teacher and student materials are consistent in layout and structure across lessons/modules/units.',
                                 'Materials\' organizational features (table of contents, glossary, index, internal references, table headers, captions, etc.) are clear, accurate, and error-free.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "The visual design (whether in print or digital) supports students in engaging thoughtfully with the subject, and is neither distracting nor chaotic.",
                                guidingQuestion: "Does the visual design (whether in print or digital) support students in engaging thoughtfully with the subject, and is neither distracting nor chaotic?",
                                purpose: "This indicator examines the visual design to determine if images, graphics, and models support student learning and engagement, without being visually distracting; examines for consistency in layout of the teacher and student materials; examines resources to determine whether they clearly communicate information; and examines resources to determine whether they contain any errors as they relate to usability.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher and student materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe how images, graphics, and models support student learning and engagement without being visually distracting.",
                                        "Describe whether teacher and student materials are consistent in layout and structure across lessons/modules/units.",
                                        "Describe if and how the images, graphics, and models clearly communicate information or support student understanding of topics, texts, or concepts.",
                                        "Identify any errors in the resources related to usability."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Do all images, graphics, and models support student learning and engagement, without being visually distracting?",
                                        "Are the teacher and student materials consistent in layout and structure?",
                                        "Are there any directions, questions, or information in the materials or assessments that are ambiguous, unclear, or inaccurate?",
                                        "Are the organizational features (Table of Contents, glossary, index, internal references, table headers, captions, etc.) in the materials clear, accurate, and error-free?"
                                    ]
                                }
                            }
                         },
                         {
                             id: '3u',
                             name: '3u. Materials provide teacher guidance for the use of embedded technology to support and enhance student learning, when applicable.',
                             scoringOptions: [], // Narrative Only
                             scoringCriteria: [
                                 'Teacher guidance is provided for the use of embedded technology to support and enhance student learning, when applicable.',
                             ],
                             isNarrativeOnly: true,
                             isNonNegotiable: false,
                             evidenceGuide: {
                                indicatorName: "Materials provide teacher guidance for the use of embedded technology to support and enhance student learning, when applicable.",
                                guidingQuestion: "Do the materials provide teacher guidance for the use of embedded technology to support and enhance student learning, when applicable?",
                                purpose: "This indicator examines the materials to determine whether they provide teacher guidance for the use of embedded technology to support and enhance student learning and is applicable to materials with digital components only.",
                                researchConnection: "No specific research connection provided for this indicator.",
                                scoringDetails: [
                                    { score: 'N/A', text: "Scoring: Narrative Evidence Only. No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                evidenceCollection: {
                                    locationsToReview: [
                                        "Review teacher materials across the series."
                                    ],
                                    recordEvidence: [
                                        "Describe where and how the materials provide guidance for using embedded technology to support and enhance student learning, where applicable."
                                    ]
                                },
                                clusterMeeting: {
                                    questions: [
                                        "Where and how do teacher materials provide guidance for using embedded technology to support and enhance student learning, where applicable?"
                                    ]
                                }
                            }
                         },
                     ]
                 }
             ]
         }
    ],
     // Logic to determine final rating based on gateway ratings
     // Conditions are evaluated in order. First condition that is true determines the rating.
     // 'g' is a placeholder for an object like { gateway1: 'Rating1', gateway2: 'Rating2', gateway3: 'Rating3' }
     finalRatingLogic: [
         { condition: (g) => g.gateway1 === 'Does Not Meet Expectations' || g.gateway2 === 'Does Not Meet Expectations', result: 'Does Not Meet Expectations' },
         { condition: (g) => g.gateway1 === 'Meets Expectations' && g.gateway2 === 'Meets Expectations' && g.gateway3 === 'Meets Expectations', result: 'Meets Expectations' },
         { condition: (g) => g.gateway1 === 'Meets Expectations' && g.gateway2 === 'Meets Expectations' && !g.gateway3, result: 'Meets Expectations (Gateway 3 not evaluated)' },
          { condition: (g) => true, result: 'Partially Meets Expectations' } // Default case
     ]
};
console.log("Science K-5 Rubric data loaded.");
console.log("window.rubrics after science-k5.js:", Object.keys(window.rubrics));