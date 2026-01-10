window.rubrics = window.rubrics || {}; // Ensure the global object exists

window.rubrics['science-hs'] = {
    id: 'science-hs',
    name: 'NGSS High School Rubric (EdReports v2.0)',
    description: 'EdReports Core Content Review Criteria v2.0 for Science, High School. Document updated 11/18/2024.',
    metadataFields: [
        { id: 'reviewTitle', label: 'Title of Material:', type: 'text' },
        { id: 'publisher', label: 'Publisher:', type: 'text' },
        {
            id: 'gradeLevel', label: 'Grade Level:', type: 'select', options: [
                { value: "", text: "Select Grade Level" },
                { value: "9", text: "Grade 9" },
                { value: "10", text: "Grade 10" },
                { value: "11", text: "Grade 11" },
                { value: "12", text: "Grade 12" },
                { value: "9-12", text: "Grades 9-12" }
            ],
            defaultValue: "9-12"
        },
        { id: 'reviewDate', label: 'Review Date:', type: 'date' },
        { id: 'reviewerName', label: 'Reviewer Name:', type: 'text' }
    ],
    gateways: [
        {
            id: 'gateway1',
            name: 'Gateway 1: Designed for NGSS',
            description: 'Materials leverage science phenomena and engineering problems in the context of driving learning and student performance and are designed for three-dimensional learning and assessment.',
            totalPoints: 34,
            // Thresholds are based on common EdReports patterns (e.g., Meets ~80%+, Partially ~50%+), as PDF shows "XX-XX".
            ratingThresholds: { meets: 28, partially: 17 }, // Assumed: Meets 28-34, Partially 17-27
            criterionSections: [
                {
                    id: 'criterion1_1',
                    name: 'Criterion 1.1: Phenomena and Problems Drive Learning',
                    description: 'Materials leverage science phenomena and engineering problems in the context of driving learning and student performance.',
                    totalPoints: 16,
                    evidenceGuide: {
                        "purpose": "A major goal for NGSS-designed science education is for \"students to be able to explain real-world phenomena and to design solutions to problems using their understanding of the DCIs, CCCs, and SEPs. By doing so, students develop their understanding of the DCIs by engaging in the SEPs and applying the CCCs. These three dimensions are tools that students can acquire and use to answer questions about the world around them and to solve design problems.\" (2015 Achieve NGSS Innovations, p. 2)\n\nThis criterion\n• supports the NGSS innovation related to using phenomena and problems to drive instruction.\n• examines the materials to determine the extent that students are engaged in making sense of natural phenomena or solving design problems in meaningful ways.\n• examines whether phenomena or problems are used as more than just an attention grabber or hook; the phenomenon or problem is what is used to drive instruction and connect student sensemaking to the three dimensions (DCIs, SEPs, CCCs) within and across learning opportunities.",
                        "researchConnection": "\"... the goal of science is to develop a set of coherent and mutually consistent theoretical descriptions of the world that can provide explanations over a wide range of phenomena. For engineering, however, success is measured by the extent to which a human need or want has been addressed.\" (A Framework for K-12 Science Education, p. 48)\n\n\"Asking students to demonstrate their own understanding of the implications of a scientific idea by developing their own explanations of phenomena, whether based on observations they have made or models they have developed, engages them in an essential part of the process by which conceptual change can occur.” (A Framework for K-12 Science Education, p. 68)\n\n\"Learning to explain phenomena and solve problems is the central reason students engage in the three dimensions of the NGSS. Students explain phenomena by developing and applying the Disciplinary Core Ideas (DCIs) and Crosscutting Concepts (CCCs) through use of the Science and Engineering Practices (SEPs).” (Using Phenomena in NGSS-Designed Lessons and Units)",
                        "scoringDetails": [
                            { "score": "Meets Expectations", "text": "14-16 points" },
                            { "score": "Partially Meets Expectations", "text": "8-13 points" },
                            { "score": "Does Not Meet Expectations", "text": "<8 points" }
                        ]
                    },
                    items: [
                        {
                            id: '1a',
                            name: '1a. Materials are designed to include both phenomena and problems.',
                            scoringOptions: [0, 2, 4],
                            scoringCriteria: [
                                'Materials consistently provide learning opportunities that include phenomena or problems.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials are designed to include both phenomena and problems.",
                                "guidingQuestion": "Are the materials designed to include both phenomena and problems?",
                                "purpose": "This indicator\n• examines the presence, structure, function, and use of phenomena and problems in materials.\n• sets the stage for review of indicators 1b, 1c, and 1d, as those indicators are dependent on identification of phenomena and/or problems.",
                                "researchConnection": "Read information for Gateway 1, Criterion 1.\n\n“CONCLUSION 2: Teachers can use students' curiosity to motivate learning by choosing phenomena and design challenges that are interesting and engaging to students, including those that are locally and/or culturally relevant. Science investigation and engineering design give middle and high school students opportunities to engage in the wider world in new ways by providing agency for them to develop questions and establish the direction for their own learning experiences.” (Science and Engineering for Grades 6-12: Investigation and Design at the Center, p. 4)",
                                "scoringDetails": [
                                    { "score": 4, "text": "Materials consistently provide learning opportunities that include phenomena and/or problems." },
                                    { "score": 2, "text": "Materials provide learning opportunities that include phenomena and/or problems, but inconsistently." },
                                    { "score": 0, "text": "Materials provide few to no learning opportunities that include phenomena. OR\nMaterials provide few to no learning opportunities that include problems." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review all learning sequences and learning opportunities where the materials claim the presence of a phenomenon or problem in both student and teacher materials across the course."
                                    ],
                                    "recordEvidence": [
                                        "Describe where students are presented with a specific, observable event that can be explained by science content as an introduction to a learning opportunity or sequence (phenomenon).",
                                        "Describe where students are presented with a challenge or situation that people want to change (problem) or a solution to optimize (design challenge) as an introduction to a learning opportunity or sequence.",
                                        "Determine if students return to the phenomenon, problem, or design challenge in the learning opportunity or sequence after its initial introduction.",
                                        "Determine if the phenomenon is unexplained or if the materials immediately provide students with an explanation.",
                                        "Determine if the materials provide context for the problem or design challenge and if students understand why they are solving the problem or design challenge."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Phenomena and problems consistently connect to grade-band appropriate DCIs or their elements.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Phenomena and/or problems require student use of grade-band Disciplinary Core Ideas.",
                                "guidingQuestion": "Are the phenomena or problems connected to grade-band Disciplinary Core Ideas (DCIs)?",
                                "purpose": "This indicator\n• examines whether phenomena or problems within the course are rooted in grade-band appropriate DCIs.",
                                "researchConnection": "Read information for Gateway 1, Criterion 1.",
                                "scoringDetails": [
                                    { "score": 2, "text": "Phenomena and/or problems consistently connect to grade-band appropriate DCIs or their elements." },
                                    { "score": 1, "text": "Phenomena and/or problems connect to grade-band DCIS or their elements, but not consistently." },
                                    { "score": 0, "text": "Phenomena and/or problems do not connect to grade-band DCIs or their elements." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review all locations where a phenomenon or problem has been identified in the materials (see Indicator 1a)."
                                    ],
                                    "recordEvidence": [
                                        "Determine what DCI element is connected. DCIs must be on grade-band and come from the life, physical, or earth and space science domains. If a problem or phenomenon is connected to an ETS DCI, it must also be connected to one of the other three domains.",
                                        "Phenomena and problems may demonstrate multiple DCIs. Use the presentation and supporting text/materials to determine the DCI focus."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Materials consistently present phenomena and/or problems in a direct manner to students.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Phenomena and/or problems are presented in a direct manner to students.",
                                "guidingQuestion": "Are phenomena and/or problems presented to students in a direct manner that creates a common experience and entry point?",
                                "purpose": "This indicator\n• examines the materials to determine whether phenomena and/or problems in the course are presented in a direct manner to students.\n• examines the materials for a common experience for all students from which knowledge can be built; it does not assume that all students have background knowledge and experience.",
                                "researchConnection": "\"...opportunities for students to engage in direct observations of phenomena illustrate the process of basic scientific research.\" (Taking Science to School, pp. 13-14)\n\n\"By using familiar materials and phenomena, students can more readily conjure up their own ideas and experiences and tap into these as they build explanations. This makes it possible for every student to participate in a more meaningful way.” (Ready Set Science, p. 93)",
                                "scoringDetails": [
                                    { "score": 2, "text": "Materials consistently present phenomena and/or problems in a direct manner to students." },
                                    { "score": 1, "text": "Materials present phenomena and/or problems in a direct manner to students, but not consistently." },
                                    { "score": 0, "text": "Phenomena and/or problems are presented in a direct manner to students in few to no instances." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review all locations where a phenomenon or problem is introduced in the course."
                                    ],
                                    "recordEvidence": [
                                        "Describe how the phenomenon or problem is presented to students. This may include multiple components. Consider everything the students engage with.",
                                        "A variety of presentations is acceptable: direct observation, observation by video or other multimedia, simulations, teacher demonstration, pictures, reading about them, etc.",
                                        "Describe how the presentation provides context for all students to share a common understanding of the phenomenon or problem, even if they aren't familiar with it.",
                                        "Describe how the presentation makes it clear what to attend to in the phenomenon or problem. Describe any distracting elements of the presentation."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How often do the materials present phenomena and/or problems in a direct manner to students?",
                                        "How often do the materials present phenomena and/or problems in a way that is not direct (e.g. contains distracting information or not enough context)?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '1d',
                            name: "1d. Materials intentionally leverage students' prior knowledge and/or experiences related to phenomena or problems.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                "Materials consistently elicit and leverage students' prior knowledge and/or experience related to phenomena and problems."
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials intentionally leverage students' prior knowledge and/or experiences related to phenomena or problems.",
                                "guidingQuestion": "Do the materials intentionally leverage students' prior knowledge and/or experiences related to phenomena or problems?",
                                "purpose": "This indicator\n• examines the materials to determine if they are designed to both elicit and leverage students' prior knowledge and/or experiences to support engaging with phenomena or solving problems.\n• emphasizes the importance of student questions in driving learning.",
                                "researchConnection": "\"Everyday experience provides a rich base of knowledge and experience to support conceptual changes in science. Students bring cultural funds of knowledge that can be leveraged, combined with other concepts, and transformed into scientific concepts over time. Everyday contexts and situations that are important in children's lives not only influence their repertoires of practice but also are likely to support their development of complex cognitive skills.\" (A Framework for K-12 Science Education, p. 284).\n\n\"To advance students' conceptual understanding, prior knowledge and questions should be evoked and linked to experiences with experiments, data, and phenomena.\" (Taking Science to School, p. 251)\n\n\"As instruction taps their entering knowledge and skills, students must reconcile their prior knowledge and experiences with new, scientific meanings of concepts, terms, and practices.” (Taking Science to School, p. 264)\n\n\"Children's understandings of the world sometimes contradict scientific explanations. These conceptions about the natural world can pose obstacles to learning science. However, their prior knowledge also offers leverage points that can be built on to develop their understanding of scientific concepts and their ability to engage in scientific investigations. Thus, children's prior knowledge must be taken into account in order to design instruction in strategic ways that capitalize on the leverage points and adequately address potential areas of misunderstanding.” (Taking Science to School, pp. 337-338)\n\n\"Conclusion 4: Students' knowledge and experience play a critical role in their science learning, influencing all four strands of science understanding. Children's concepts can be both resources and barriers to emerging understanding. These concepts can be enriched and transformed by appropriate classroom experiences.\" Science learners require instructional support to engage in scientific practices and to interpret experience and experiments in terms of scientific ideas.\" (Taking Science to School, p. 337)\n\n\"A key, if not central, feature of scientific discourse is the role of questioning in eliciting explanations, postulating theories, evaluating evidence, justifying reasoning, and clarifying doubts. Put simply, the act of questioning encourages learners to engage in critical reasoning. Given that asking questions is fundamental to science and scientific inquiry, the development of students' abilities to ask questions, reason, problem-solve, and think critically should, likewise, become a central focus of current science education reform.\" (Students' questions: a potential resource for teaching and learning science, p.2)",
                                "scoringDetails": [
                                    { "score": 2, "text": "Materials consistently elicit and leverage students' prior knowledge and/or experience related to phenomena and problems." },
                                    { "score": 1, "text": "Materials elicit and leverage students' prior knowledge and/or experience related to phenomena and problems but not consistently. OR\nMaterials consistently elicit but do not consistently leverage students' prior knowledge and/or experience related to phenomena and problems." },
                                    { "score": 0, "text": "Materials elicit but do not leverage students' prior knowledge and/or experience related to phenomena and problems, but not consistently." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review all locations where a phenomenon or problem has been identified."
                                    ],
                                    "recordEvidence": [
                                        "Describe where the materials explicitly provide opportunities for students to share their prior knowledge and/or experience, from outside the classroom, connected to phenomena and/or problems or directly related science content (eliciting).",
                                        "Describe where the materials explicitly use elicited prior knowledge and/or experience (leveraging).\n  o Describe how the materials incorporate students' prior knowledge and/or experience into instruction.\n  o Describe where the materials explicitly leverage students' prior knowledge and/or experience to make sense of phenomena and/or solve problems.\n  o Describe where the materials explicitly leverage students' prior knowledge and/or experience to support them to see changes in their ideas or understanding.",
                                        "Note instances of activating prior knowledge from within the course, making predictions, asking questions, and other forms of implicit engagement of prior knowledge and/or experience rather than explicit elicitation and leveraging."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Materials consistently use phenomena or problems to engage with all three dimensions.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Phenomena and/or problems drive student learning using key elements of all three dimensions.",
                                "guidingQuestion": "Do phenomena and/or problems drive instruction using key elements of all three dimensions?",
                                "purpose": "This indicator\n• examines the materials to determine if they are designed to engage students in explaining phenomena or solving design problems in meaningful ways.\n• examines whether materials use phenomena or problems to support students to engage with and apply the three dimensions (DCIs, SEPs, CCCs).",
                                "researchConnection": "Read information for Gateway 1, Criterion 1.",
                                "scoringDetails": [
                                    { "score": 6, "text": "Materials consistently use phenomena or problems to drive student learning. AND\nMaterials consistently use phenomena or problems to engage with all three dimensions." },
                                    { "score": 3, "text": "Materials use phenomena or problems to drive student learning, but not consistently. AND\nMaterials use phenomena or problems to engage with all three dimensions, but not consistently or consistently with two dimensions." },
                                    { "score": 0, "text": "Materials provide few to no instances that use phenomena or problems to drive student learning. OR\nMaterials provide few to no instances that use phenomena or problems to engage with two or three dimensions." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the student and teacher materials across the course."
                                    ],
                                    "recordEvidence": [
                                        "Determine where phenomena and/or problems serve as a central component of the student activity and learning.",
                                        "Determine where the goal of student activity and learning is to explain a phenomenon or solve a problem, or to work towards an explanation or solution.",
                                        "Determine where the connection between the phenomenon and/or problem and student activity is apparent to students.",
                                        "Determine which elements of the three dimensions are directly part of student engagement with the phenomenon and/or problem.",
                                        "Describe where and how students return to the phenomenon and/or problem after it is initially introduced.",
                                        "Describe where a phenomenon or problem is present, but does not drive instruction, such as when they \"bookend” instruction and are only present at the beginning and end of a sequence.",
                                        "When a phenomenon and/or problem does not drive learning, describe what drives learning instead. Are students focused on a DCI or science concept, completing an activity or lab not connected to a phenomenon or problem, answering a guiding question, etc.?"
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How often are students engaged in phenomenon and/or problem-driven activities and learning?",
                                        "When phenomena and/or problems drive student learning, how often do students engage with DCIs, SEPs, and CCCs in order to explain the phenomenon or solve the problem?",
                                        "How often is student learning driven by something other than a phenomenon or problem?"
                                    ]
                                }
                            }
                        }
                    ]
                },
                {
                    id: 'criterion1_2',
                    name: 'Criterion 1.2: Three-Dimensional Learning and Assessment',
                    description: 'Materials are designed for three-dimensional learning and assessment.',
                    totalPoints: 18,
                    evidenceGuide: {
                        "purpose": "This criterion\n• supports the NGSS innovation related to integration of the three dimensions in learning experiences in order to support sensemaking.\n• examines the materials for clear and accurate learning objectives related to three-dimensional instruction.\n• examines both formative and summative assessments as part of the assessment system\n• examines the materials to determine if learning objectives are connected to assessments.\n• examines the materials to determine if assessments address claimed assessment standards.\n• examines the materials to determine how assessments incorporate uncertain phenomena/problems and integrate the three dimensions.",
                        "researchConnection": "See the individual indicators for relevant research connections.",
                        "scoringDetails": [
                            { "score": "Meets Expectations", "text": "15-18 points" },
                            { "score": "Partially Meets Expectations", "text": "9-14 points" },
                            { "score": "Does Not Meet Expectations", "text": "<9 points" }
                        ]
                    },
                    items: [
                        {
                            id: '1f',
                            name: '1f. Materials are designed to incorporate the three dimensions in student learning opportunities.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Learning sequences consistently include student learning opportunities that incorporate the three dimensions.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials are designed to incorporate the three dimensions in student learning opportunities.",
                                "guidingQuestion": "Are the materials designed to incorporate the three dimensions into student learning opportunities?",
                                "purpose": "This indicator\n• examines the materials to determine if individual learning opportunities are designed to include the three dimensions.",
                                "researchConnection": "\"...the framework and its resulting standards have a number of implications for implementation, one of which involves the need for curricular and instructional materials that embody all three dimensions: scientific and engineering practices, crosscutting concepts, and disciplinary core ideas.” (A Framework for K-12 Science Education, p. 316)",
                                "scoringDetails": [
                                    { "score": 2, "text": "Learning sequences consistently include student learning opportunities that incorporate the three dimensions." },
                                    { "score": 1, "text": "Learning sequences include student learning opportunities that incorporate the three dimensions, but not consistently." },
                                    { "score": 0, "text": "Few to no learning sequences include student learning opportunities that incorporate the three dimensions." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials across the course."
                                    ],
                                    "recordEvidence": [
                                        "Identify the presence of below and/or above grade band elements.",
                                        "Note any patterns in how learning opportunities that include the three dimensions are distributed across the materials.",
                                        "Only look for the presence of the elements. Do not consider the quality of student engagement with the elements or integration of the elements. (See 1h)"
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How often do learning opportunities include the three dimensions?",
                                        "How many of these learning opportunities are present within each learning sequence?",
                                        "Consider the number of overall learning opportunities in the materials and how many include the three dimensions, per learning sequence.\n  o How many learning sequences include at least one learning opportunity where students engage in all three dimensions?"
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
                                'Materials consistently provide opportunities for students to iterate on their thinking as they engage in sensemaking.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials consistently support meaningful student sensemaking with the three dimensions.",
                                "guidingQuestion": "Are the materials designed to support meaningful student sensemaking with the three dimensions?",
                                "purpose": "This indicator\n• supports the Next Generation Science Standards (NGSS) innovation related to integration of the three dimensions in learning experiences to support sensemaking.",
                                "researchConnection": "\"Each NGSS standard integrates one specific SEP, CCC, and DCI into a performance expectation that details what students should be proficient in by the end of instruction. In past standards the separation of skills and knowledge often led to an emphasis (in both instruction and assessment) on science concepts and an omission of inquiry and practices. It is important to note that the NGSS performance expectations do not specify or limit the intersection of the three dimensions in classroom instruction. Multiple SEPs, CCCs, and DCIs that blend and work together in several contexts will be needed to help students build toward competency in the targeted performance expectations. (2015 Achieve NGSS Innovations, pp. 1-2)\n\n\"To capture the vision in the Framework, students should be assessed on the extent to which they have achieved a coherent scientific worldview by recognizing similarities among core ideas in science or engineering that may at first seem very different, but are united through crosscutting concepts.” (NGSS Appendix G: Crosscutting Concepts, p. 3)\n\n“The framework is designed to help realize a vision for education in the sciences and engineering in which students, over multiple years of school, actively engage in scientific and engineering practices and apply crosscutting concepts to deepen their understanding of the core ideas in these fields.” (A Framework for K-12 Science Education, p. 10)\n\n\"...learning about science and engineering involves integration of the knowledge of scientific explanations (i.e., content knowledge) and the practices needed to engage in scientific inquiry and engineering design. Thus the framework seeks to illustrate how knowledge and practice must be intertwined in designing learning experiences in K-12 science education.\" (A Framework for K-12 Science Education, p. 11)\n\n\"Curricula based on the framework and resulting standards should integrate the three dimensions—scientific and engineering practices, crosscutting concepts, and disciplinary core ideas—and follow the progressions articulated in this report.\" (A Framework for K-12 Science Education, p. 246)\n\n“...sensemaking is a dynamic process of building or revising an explanation in order to \"figure something out\"-to ascertain the mechanism underlying a phenomenon in order to resolve a gap or inconsistency in one's understanding. One builds this explanation out of a mix of everyday knowledge and formal knowledge by iteratively proposing and connecting up different ideas on the subject. One also simultaneously checks that those connections and ideas are coherent, both with one another and with other ideas in one's knowledge system. (Defining sensemaking: Bringing clarity to a fragmented theoretical construct, p. 191-192)",
                                "scoringDetails": [
                                    { "score": 4, "text": "Materials are designed for the three dimensions to consistently and meaningfully support student sensemaking across the learning sequences. AND\nMaterials consistently provide opportunities for students to iterate on their thinking as they engage in sensemaking." },
                                    { "score": 2, "text": "Materials are designed for two dimensions to consistently and meaningfully support student sensemaking across the learning sequences. OR\nMaterials are designed for the three dimensions to meaningfully support sensemaking across the learning sequences, but not consistently. OR\nMaterials provide opportunities for students to iterate on their thinking as they engage in sensemaking, but not consistently." },
                                    { "score": 0, "text": "Materials are designed to meaningfully support student sensemaking with two dimensions across the learning sequences, but not consistently. OR\nMaterials do not provide opportunities for students to iterate on their thinking as they engage in sensemaking." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials across the course."
                                    ],
                                    "recordEvidence": [
                                        "Determine where students engage with novel, uncertain, or unexplained phenomena, problems, or scientific concepts.",
                                        "Determine where students use their prior knowledge, new information, and evidence to figure out novel, uncertain, or unexplained phenomena, problems, or scientific concepts.",
                                        "Determine where students have the opportunity to iterate on their thinking as they figure out novel, uncertain, or unexplained phenomena, problems, or scientific concepts. This includes both discourse and individual reflection.",
                                        "Determine where student sensemaking requires meaningful, intentional, and integrated use of SEPs, CCCs, and DCIs.",
                                        "Determine where meaningful and intentional presence of two-dimensional integration of SEPs and DCIs, CCCs and DCIs, or CCCs and SEPs occurs.",
                                        "Identify the presence of above and/or below grade band elements associated with sensemaking."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Materials consistently provide opportunities for students to use and engage with the elements of the three dimensions present in the objectives.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials clearly represent three-dimensional learning objectives within the learning sequences.",
                                "guidingQuestion": "Are the materials designed to clearly represent three-dimensional learning objectives within the learning sequences?",
                                "purpose": "This indicator\n• examines the materials to determine if there is a clear connection between the three dimensional learning objectives and the learning sequences.\n• does not look for exact matches of designed learning experiences to the performance expectations.",
                                "researchConnection": "\"It should also be noted that one performance expectation should not be equated to one lesson. Performance expectations define the three-dimensional learning expectations for students, and it is unlikely that a single lesson would provide adequate opportunities for a student to demonstrate proficiency in every dimension of a performance expectation. A series of high-quality lessons or a unit in a program are more likely to provide these opportunities.” (2015 Achieve NGSS Innovations, pp. 1-2)\n\n\"The performance expectations in the NGSS are targets for assessment. For students to achieve such performances, they will need regular opportunities to engage in learning that blend all three dimensions of the standards throughout their classroom experiences, from kindergarten through high school (K-12).“ (Guide to Implementing the Next Generation Science Standards, p. 25)\n\n\"No matter the scope of the ultimate learning goals, it is important that they accurately indicate what students actually learn in the materials. This match allows teachers to have accurate expectations of student learning in each lesson as well as to be confident that the lesson will contribute to the overall program that gives students sufficient opportunities to reach or exceed all parts of the standards.\" (Critical Features of Instructional Materials Design for Today's Science Standards, p. 6)",
                                "scoringDetails": [
                                    { "score": 2, "text": "The materials consistently provide element-level three-dimensional learning objectives. AND\nMaterials consistently provide opportunities for students to use and engage with the elements of the three dimensions present in the objectives." },
                                    { "score": 1, "text": "The materials provide element-level three-dimensional learning objectives, but not consistently. OR\nMaterials provide opportunities for students to use and engage with the elements of the three dimensions present in the objectives, but not consistently." },
                                    { "score": 0, "text": "The materials provide few to no element-level three-dimensional learning objectives. OR\nMaterials provide few to no opportunities for students to use and engage with the elements of the three dimensions present in the objectives." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials across the course."
                                    ],
                                    "recordEvidence": [
                                        "Identify the learning objectives for each learning sequence or opportunity. Determine if the learning objectives are three dimensional and if they provide element-level information.\n  o If component level specificity is provided, assume all elements within that component are intended to be present",
                                        "Determine where there is a match between the learning objectives and what students are actually asked to do in learning sequences and opportunities."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'The formative assessments are consistently designed to reveal student progress on the targeted learning objectives.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials include a formative assessment system that is designed to reveal student progress on targeted learning objectives.",
                                "guidingQuestion": "Are the materials designed to include a formative assessment system that reveals student progress on targeted learning objectives?",
                                "purpose": "This indicator\n• examines whether the materials include formative assessments that are connected to and reveal student progress on the targeted learning objectives.",
                                "researchConnection": "“Assessments used for formative purposes occur during the course of a unit of instruction and may involve both formal tests and informal activities conducted as part of a lesson. They may be used to identify students' strengths and weaknesses, assist educators in planning subsequent instruction, assist students in guiding their own learning by evaluating and revising their own work, and foster students' sense of autonomy and responsibility for their own learning (Andrade and Cizek, 2010, p. 4).\" (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 84)\n\n\"The key difference between assessments used for formative purposes and those used for summative purposes is in how the information they provide is to be used: to guide and advance learning (usually while instruction is under way) or to obtain evidence of what students have learned for use beyond the classroom (usually at the conclusion of some defined period of instruction). Whether intended for formative or summative purposes, evidence gathered in the classroom should be closely linked to the curriculum being taught. This does not mean that the assessment must use the formats or exactly the same material that was presented in instruction, but rather that the assessment task should directly address the concepts and practices to which the students have been exposed.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 85)",
                                "scoringDetails": [
                                    { "score": 4, "text": "The formative assessments are consistently designed to reveal student progress on the targeted learning objectives." },
                                    { "score": 2, "text": "The formative assessments are designed to reveal student progress on the targeted learning objectives, but not consistently." },
                                    { "score": 0, "text": "Few to no formative assessments are designed to reveal student progress on the targeted learning objectives." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "All identified formative assessment tasks in both student and teacher materials."
                                    ],
                                    "recordEvidence": [
                                        "Use the learning objectives identified in indicator 1h.",
                                        "Identify elements of the learning objectives in the formative assessments.",
                                        "Formative assessments can include activities for individuals or groups of students.",
                                        "Determine how many elements of the learning objectives are addressed in the assessments.\n  o Consider all formative assessments within each sequence associated with a set of learning objectives.",
                                        "Look for the presence of all elements indicated by the objectives (including off-grade band elements).",
                                        "Do not focus on supports for interpreting assessments. These are covered in the examination of the assessment system in indicators 3g and 3n in Gateway 3."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "Which types of assessments are used to support the formative process? Where are they present? Are they always consistent in form and function, or do they vary?",
                                        "How many elements are evaluated in the formative assessments associated with a set of learning objectives?\n  o How many learning sequences or opportunities assess most or all of the elements from the associated learning objectives?\n  o How do formative assessments within the assessment system reveal student progress and use of the three dimensions as connected to the learning objectives?"
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
                                'The summative assessment system is designed to measure student achievement of all or nearly all of the claimed assessment standards.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials include a summative assessment system designed to elicit direct, observable evidence of student achievement of claimed assessment standards.",
                                "guidingQuestion": "Are the materials designed to include a summative assessment system that is designed to elicit direct, observable evidence of student achievement of claimed assessment standards?",
                                "purpose": "This indicator\n• determines whether the materials identify the standards addressed by each assessment in the summative assessment system.\n• examines whether the summative assessment system is designed to elicit evidence of learning of all of the claimed assessment standards.",
                                "researchConnection": "“RECOMMENDATION 4-2 Curriculum developers, assessment developers, and others who create resource materials aligned to the science framework and the Next Generation Science Standards should ensure that assessment activities included in such materials (such as mid- and end-of-chapter activities, suggested tasks for unit assessment, and online activities) require students to engage in practices that demonstrate their understanding of core ideas and crosscutting concepts.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 131)\n\n\"The goal of learning goes beyond student performance in the classroom. Students need opportunities to build proficiencies that will serve as tools to help them solve problems in the real world and make sense of phenomena in everyday life. These tools are most effective when students know about them explicitly. Therefore, one goal of high-quality materials is to help students build an explicit understanding of what they are learning and how it can be applied to other situations.” (Critical Features of Instructional Materials Design for Today's Science Standards, p. 25)",
                                "scoringDetails": [
                                    { "score": 4, "text": "Materials consistently identify the standards assessed for summative assessments. AND\nThe summative assessment system is designed to measure student achievement of all or nearly all of the claimed assessment standards." },
                                    { "score": 2, "text": "Materials identify the standards assessed for summative assessments, but not consistently. OR\nThe summative assessment system is designed to measure student achievement of most of the claimed assessment standards." },
                                    { "score": 0, "text": "Numerous summative assessments do not identify the standards assessed. OR\nNumerous claimed assessment standards are not measured by the summative assessment system." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "All identified summative assessments in both student and teacher materials."
                                    ],
                                    "recordEvidence": [
                                        "Determine where the materials identify the standards assessed by each assessment or assessment question.",
                                        "Determine what standards are measured by each assessment.\n  o Individual SEPs, DCIs, or CCCs may individually be present in each of the various components of an assessment within the summative process.",
                                        "Do not consider assessment of standards outside of the grade-band.",
                                        "Do not focus on supports for interpreting assessments. These are covered in the examination of the assessment system in indicators 3g and 3n in Gateway 3."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Assessments consistently incorporate uncertain phenomena or problems.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials are designed to include three-dimensional assessments that incorporate uncertain phenomena or problems.",
                                "guidingQuestion": "Are the materials designed to incorporate three-dimensional assessments that incorporate uncertain phenomena or problems?",
                                "purpose": "This indicator\n• determines if materials are designed to incorporate three-dimensional assessments that incorporate uncertain phenomena or problems.",
                                "researchConnection": "\"Assessment tasks, in turn, have to be designed to provide evidence of students' ability to use the practices, to apply their understanding of the crosscutting concepts, and to draw on their understanding of specific disciplinary ideas, all in the context of addressing specific problems.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 32)\n\n“CONCLUSION 2-1 Measuring the three-dimensional science learning called for in the Framework and the Next Generation Science Standards requires assessment tasks that examine students' performance of scientific and engineering practices in the context of crosscutting concepts and disciplinary core ideas. To adequately cover the three dimensions, assessment tasks will generally need to contain multiple components (e.g., a set of interrelated questions). It may be useful to focus on individual practices, core ideas, or crosscutting concepts in the various components of an assessment task, but, together, the components need to support inferences about students' three-dimensional science learning as described in a given performance expectation.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 44)\n\n“CONCLUSION 2-4 Effective evaluation of three-dimensional science learning requires more than a one-to-one mapping between the Next Generation Science Standards (NGSS) performance expectations and assessment tasks. More than one assessment task may be needed to adequately assess students' mastery of some performance expectations, and any given assessment task may assess aspects of more than one performance expectation. In addition, to assess both understanding of core knowledge and facility with a practice, assessments may need to probe students' use of a given practice in more than one disciplinary context. Assessment tasks that attempt to test practices in strict isolation from one another may not be meaningful as assessments of the three-dimensional science learning called for by the NGSS.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, p. 46)",
                                "scoringDetails": [
                                    { "score": 2, "text": "Assessments consistently incorporate uncertain phenomena or problems. AND\nWhen incorporating uncertain phenomena or problems, assessments consistently integrate the three dimensions." },
                                    { "score": 1, "text": "Assessments incorporate uncertain phenomena or problems, but not consistently. OR\nWhen incorporating uncertain phenomena or problems, assessments integrate the three dimensions, but not consistently. OR\nWhen incorporating uncertain phenomena or problems, assessments integrate two dimensions consistently." },
                                    { "score": 0, "text": "Few to no assessments incorporate uncertain phenomena or problems. OR\nWhen incorporating uncertain phenomena or problems, few to no assessments integrate the three dimensions. OR\nWhen incorporating uncertain phenomena or problems, assessments integrate two dimensions, but not consistently." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "All identified summative and formative assessments in both student and teacher materials."
                                    ],
                                    "recordEvidence": [
                                        "Use information about elements identified in formative and summative assessment tasks from indicators 1i and 1j.",
                                        "Describe when and how the assessments provide students the opportunity to apply their learning to an uncertain phenomenon or problem.\n  o An uncertain phenomenon or problem can consist of a completely novel scenario or a new aspect of a phenomenon or problem students have already engaged with.",
                                        "Describe how elements of the three dimensions are used together in assessments and assessment questions.\n  o In a set of questions related to the same scenario or phenomenon, the three dimensions may be present across the set. They do not need to all be present in a single question.\n  o For a single question related to an isolated phenomenon or scenario, look for the presence of all three dimensions in the question.",
                                        "Do not consider assessment of standards outside of the grade-band.",
                                        "Do not focus on supports for interpreting assessments, as these are covered in the examination of the assessment system in indicators 3g and 3n in Gateway 3."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How often do assessments include opportunities for students to engage with uncertain phenomena and problems?",
                                        "How often do students engage with all three dimensions in assessments that incorporate uncertain phenomena and problems?",
                                        "Describe the types of assessments that incorporate uncertain phenomena and problems and integrate the three dimensions. Where are they present? Are they always consistent in form and function or do they vary?",
                                        "Consider program design and location of assessments when determining consistency for incorporation of uncertain phenomena or problems and integration of the three dimensions."
                                    ]
                                }
                            }
                        }
                    ]
                }
            ]
        },
        {
            id: 'gateway2',
            name: 'Gateway 2: Coherence and Scope',
            description: 'Materials are coherent in design, scientifically accurate, and support grade-band endpoints made for all three dimensions. NOTE: Indicators 2d-2e are non-negotiable; materials being reviewed must score above zero points in each indicator, otherwise the materials automatically do not proceed to Gateway 3.',
            totalPoints: 32,
            // Thresholds are based on common EdReports patterns, as PDF shows "XX-XX".
            ratingThresholds: { meets: 26, partially: 16 }, // Assumed: Meets 26-32, Partially 16-25
            criterionSections: [
                {
                    id: 'criterion2_1',
                    name: 'Criterion 2.1: Coherence and Full Scope of the Three Dimensions',
                    description: 'Materials are coherent in design, scientifically accurate, and support grade-band endpoints made for all three dimensions.',
                    totalPoints: 32,
                    evidenceGuide: {
                        "purpose": "\"The Framework's vision is that students will acquire knowledge and skill in science and engineering through a carefully designed sequence of learning experiences. Each stage in the sequence will develop students' understanding of particular scientific and engineering practices, crosscutting concepts, and disciplinary core ideas while also deepening their insights into the ways in which people from all backgrounds engage in scientific and engineering work to satisfy their curiosity, seek explanations about the world, and improve the built world.\" (A Framework for K-12 Science Education, p. 247)\n\n\"Students also develop their understanding of the DCIs by engaging in the SEPs and applying the CCCs. These three dimensions are tools that students can acquire and use to answer questions about the world around them and to solve design problems.\" (2015 Achieve NGSS Innovations, p. 2)\n\nThis criterion\n• examines the materials to determine the extent that students are engaged in learning coherent, accurate, and grade-band appropriate science.\n• examines the materials to determine the extent that the claimed disciplinary core ideas are included within the course.\n• examines the materials to determine the extent that the claimed science and engineering practices are included within the course.\n• examines the materials to determine the extent that the claimed crosscutting concepts are included within the course.",
                        "researchConnection": "\"To develop a thorough understanding of scientific explanations of the world, students need sustained opportunities to work with and develop the underlying ideas and to appreciate those ideas' interconnections over a period of years rather than weeks or months... This sense of development has been conceptualized in the idea of learning progressions... If mastery of a core idea in a science discipline is the ultimate educational destination, then well-designed learning progressions provide a map of the routes that can be taken to reach that destination. Such progressions describe both how students' understanding of the idea matures over time and the instructional supports and experiences that are needed for them to make progress. Learning progressions may extend all the way from preschool to 12th grade and beyond—indeed, people can continue learning about scientific core ideas their entire lives. Because learning progressions extend over multiple years, they can prompt educators to consider how topics are presented at each grade level so that they build on prior understanding and can support increasingly sophisticated learning. Hence, core ideas and their related learning progressions are key organizing principles for the design of the framework.” (A Framework for K-12 Science Education, p. 28)",
                        "scoringDetails": [
                            { "score": "Meets Expectations", "text": "27-32 points" },
                            { "score": "Partially Meets Expectations", "text": "16-26 points" },
                            { "score": "Does Not Meet Expectations", "text": "<16 points" }
                        ]
                    },
                    items: [
                        {
                            id: '2a',
                            name: '2a. Materials provide opportunities for students to fully learn and develop all claimed grade-band Disciplinary Core Ideas.',
                            scoringOptions: [0, 4, 8],
                            scoringCriteria: [
                                'Materials provide opportunities for students to fully learn and develop nearly all claimed grade-band DCI elements.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide opportunities for students to fully learn and develop all claimed grade-band Disciplinary Core Ideas.",
                                "guidingQuestion": "Do the materials provide opportunities for students to fully learn and develop all claimed grade-band Disciplinary Core Ideas (DCIs)?",
                                "purpose": "This indicator\n• examines the materials to determine if all claimed grade-band DCIs and their elements are included in the materials.",
                                "researchConnection": "\"Conclusion 5: Proficiency in science involves having knowledge of facts and concepts as well as how these ideas and concepts are related to each other. Thus, to become more expert in science, students need to learn key ideas and concepts, how they are related to each other, and their implications and applications within the discipline. This entails a process of conceptual development that in some cases involves large-scale reorganization of knowledge and is not a simple accumulation of information. \" (Taking Science to School pp. 338-339)\n\n\"An education focused on a limited set of ideas and practices in science and engineering should enable students to evaluate and select reliable sources of scientific information and allow them to continue their development well beyond their K-12 school years as science learners, users of scientific knowledge, and perhaps also as producers of such knowledge.” (A Framework for K-12 Science Education, p. 31)",
                                "scoringDetails": [
                                    { "score": 8, "text": "Materials provide opportunities for students to fully learn and develop nearly all claimed grade-band DCI elements." },
                                    { "score": 4, "text": "Materials provide opportunities for students to fully learn and develop most of the claimed grade-band DCI elements." },
                                    { "score": 0, "text": "Materials do not provide opportunities for students to learn and develop numerous claimed grade-band DCI elements." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials.",
                                        "Review the claimed standards."
                                    ],
                                    "recordEvidence": [
                                        "Determine where claims are located within the materials and how close they are to element-level claims (document whether full or partial elements). If claims are made above the element level, all elements for that target (PE, component, sub-idea, etc.) are claimed.",
                                        "Determine where students develop grade-band understanding of each of the claimed DCIs and their components (PS, LS, ESS and/or ETS DCIs). Note if the claim is fully met, partially met, or not met by the materials.",
                                        "Determine where the full DCI is taught over the course of multiple learning opportunities, as applicable.",
                                        "Describe the specific examples of learning opportunities that include each claimed DCI and associated elements."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How many of the claimed grade-band DCI elements do the materials incorporate?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '2b',
                            name: '2b. Materials provide opportunities for students to fully learn and develop all claimed grade-band Science and Engineering Practices.**',
                            scoringOptions: [0, 4, 8],
                            scoringCriteria: [
                                'Materials provide opportunities for students to fully learn and develop nearly all claimed grade-band SEP elements.',
                                'Materials consistently provide multiple and repeated opportunities for students to use claimed grade-band SEPs across various contexts.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            note: '**NOTE: Indicators 2b and/or 2c will address NGSS Connections to Nature of Science and Engineering, if claimed by the program.',
                            evidenceGuide: {
                                "indicatorName": "Materials provide opportunities for students to fully learn and develop all claimed grade-band Science and Engineering Practices.",
                                "guidingQuestion": "Do the materials provide opportunities for students to fully learn and develop all claimed grade-band Science and Engineering Practices (SEPs)?",
                                "purpose": "This indicator\n• examines the materials to determine if the claimed grade-band appropriate SEPs and their associated elements are included in the course.\n• examines the materials to determine if multiple and repeated opportunities with the claimed grade-band SEPs are provided.\n• examines the materials to determine if SEPs from outside of the grade-band are included within the course.",
                                "researchConnection": "\"Engaging in the practices of science helps students understand how scientific knowledge develops; such direct involvement gives them an appreciation of the wide range of approaches that are used to investigate, model, and explain the world. Engaging in the practices of engineering likewise helps students understand the work of engineers, as well as the links between engineering and science. Participation in these practices also helps students form an understanding of the crosscutting concepts and disciplinary ideas of science and engineering; moreover, it makes students' knowledge more meaningful and embeds it more deeply into their worldview.” (A Framework for K-12 Science Education, p. 42)",
                                "scoringDetails": [
                                    { "score": 8, "text": "Materials provide opportunities for students to fully learn and develop nearly all claimed grade-band SEP elements. AND\nMaterials consistently provide multiple and repeated opportunities for students to use claimed grade-band SEPS across various contexts." },
                                    { "score": 4, "text": "Materials provide opportunities for students to fully learn and develop most of the claimed grade-band SEP elements. AND\nMaterials provide multiple and repeated opportunities for students to use claimed grade-band SEPs across various contexts, but not consistently." },
                                    { "score": 0, "text": "Materials provide opportunities for students to learn and develop few to none of the claimed grade-band SEP elements. OR\nMaterials include numerous elements of SEPs from below the grade-band without connecting to grade-band claimed SEPS. OR\nMaterials do not provide multiple and repeated opportunities for students to use claimed grade-band SEPS across various contexts." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials.",
                                        "Review the claimed standards."
                                    ],
                                    "recordEvidence": [
                                        "Determine where claims are located within the materials and how close they are to element-level claims (document whether full or partial elements). If claims are made above the element level, all elements for that target (PE, component, sub-idea, etc.) are claimed.",
                                        "Determine when and where students develop and use claimed grade-band appropriate SEPs and their elements, including Nature of Science topics connected to the SEPs. Note if the claim is fully met, partially met, or not met by the materials.",
                                        "Determine where the full SEP is taught over the course of multiple learning opportunities, as applicable.",
                                        "Describe the specific examples of learning opportunities to detail incorporation of all claimed grade-band SEPs and associated elements, including Nature of Science topics connected to the SEPs.",
                                        "Determine how students repeatedly use grade-band appropriate SEPs across various contexts within the course.",
                                        "Detail how the claimed SEPs are organized (to support the narrative report)."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How many of the claimed grade-band appropriate SEPs, including Nature of Science topics connected to the SEPs, do the materials incorporate?",
                                        "Do the materials provide repeated opportunities for students to use the claimed grade-band SEPs across various contexts?",
                                        "To what extent do the materials incorporate SEP elements from below the grade-band?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '2c',
                            name: '2c. Materials provide opportunities for students to fully learn and develop all claimed grade-band Crosscutting Concepts.**',
                            scoringOptions: [0, 4, 8],
                            scoringCriteria: [
                                'Materials provide opportunities for students to fully learn and develop nearly all claimed grade-band CCC elements.',
                                'Materials consistently provide multiple and repeated opportunities for students to use claimed grade-band CCCs across various contexts.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            note: '**NOTE: Indicators 2b and/or 2c will address NGSS Connections to Nature of Science and Engineering, if claimed by the program.',
                            evidenceGuide: {
                                "indicatorName": "Materials provide opportunities for students to fully learn and develop all claimed grade-band Crosscutting Concepts.",
                                "guidingQuestion": "Do the materials provide opportunities for students to fully learn and develop all claimed grade-band Crosscutting Concepts (CCCs)?",
                                "purpose": "This indicator\n• examines the materials to determine if the claimed grade-band appropriate CCCs and their associated elements are included in the course.\n• examines the materials to determine if multiple and repeated opportunities with the claimed grade-band CCCs are provided.\n• examines the materials to determine if CCCs from outside of the grade band are included within the course.",
                                "researchConnection": "\"...[Crosscutting concepts] bridge disciplinary boundaries, having explanatory value throughout much of science and engineering. These crosscutting concepts were selected for their value across the sciences and in engineering. These concepts help provide students with an organizational framework for connecting knowledge from the various disciplines into a coherent and scientifically based view of the world.” (A Framework for K-12 Science Education, p. 83)",
                                "scoringDetails": [
                                    { "score": 8, "text": "Materials provide opportunities for students to fully learn and develop nearly all claimed grade-band CCC elements. AND\nMaterials consistently provide multiple and repeated opportunities for students to use claimed grade-band CCCS across various contexts." },
                                    { "score": 4, "text": "Materials provide opportunities for students to fully learn and develop most of the claimed grade-band CCC elements. AND\nMaterials provide multiple and repeated opportunities for students to use claimed grade-band CCCs across various contexts." },
                                    { "score": 0, "text": "Materials provide opportunities for students to learn and develop few to none of the claimed grade-band CCC elements. OR\nMaterials include numerous elements of CCCs from below the grade-band without connecting to the claimed grade-band CCCs. OR\nMaterials do not provide multiple and repeated opportunities for students to use grade-band CCCs across various contexts." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials.",
                                        "Review the claimed standards."
                                    ],
                                    "recordEvidence": [
                                        "Determine where claims are located within the materials and how close they are to element-level claims (document whether full or partial elements). If claims are made above the element level, all elements for that target (PE, component, sub-idea, etc.) are claimed.",
                                        "Determine when and where students develop and use claimed grade-band appropriate CCCs and their elements, including Nature of Science and STCE topics connected to the CCCs. Note if the claim is fully met, partially met, or not met by the materials.",
                                        "Determine where the full CCC is taught over the course of multiple learning opportunities, as applicable.",
                                        "Describe the specific examples of learning opportunities to detail incorporation of all claimed grade-band CCCs and associated elements, including Nature of Science and STSE topics connected to the CCCs.",
                                        "Determine how students repeatedly use claimed grade-band appropriate CCCs across various contexts.",
                                        "Detail how the CCCs are organized (to support the narrative report)."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How many of the claimed grade-band appropriate CCCs, including Nature of Science and STSE topics connected to the CCCs, do the materials incorporate??",
                                        "Do the materials provide repeated opportunities for students to use the claimed grade-band CCCs across various contexts throughout the course?",
                                        "To what extent do the materials incorporate CCC elements from below the grade-band?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '2d',
                            name: '2d. Materials present Disciplinary Core Ideas (DCIs), Science and Engineering Practices (SEPs), and Crosscutting Concepts (CCCs) in a way that is scientifically accurate.*',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently present all three dimensions in a scientifically accurate manner.',
                                'Assessments consistently present all three dimensions in a scientifically accurate manner.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: true, // Implied by gateway progression rules
                            evidenceGuide: {
                                "indicatorName": "Materials present Disciplinary Core Ideas (DCIs), Science and Engineering Practices (SEPs), and Crosscutting Concepts (CCCs) in a way that is scientifically accurate.*",
                                "guidingQuestion": "Do the materials present Disciplinary Core Ideas (DCIs), Science and Engineering Practices (SEPs), and Crosscutting Concepts (CCCs) in a manner that is scientifically accurate?",
                                "purpose": "This indicator\n• examines whether materials present DCIs, SEPs, and CCCs in a scientifically accurate manner within learning opportunities.\n• examines whether materials present DCIs, SEPs, and CCCs in a scientifically accurate manner within assessments.",
                                "researchConnection": "Scientific rigor and accuracy of what students learn is paramount; the materials need to accurately communicate important DCIs, SEPs, and CCCs.\n\n\"...science content standards should be clear, detailed, and complete; reasonable in scope; rigorously and scientifically correct; and based on sound models of student learning.” (A Framework for K-12 Science Education, p. 298)",
                                "scoringDetails": [
                                    { "score": "NOTE", "text": "This indicator is non-negotiable; materials being reviewed must score above zero points to have an opportunity to advance past Gateway 2." },
                                    { "score": 2, "text": "Materials consistently present all three dimensions in a scientifically accurate manner. AND\nAssessments consistently present all three dimensions in a scientifically accurate manner." },
                                    { "score": 1, "text": "Materials contain a few minor errors when presenting DCIs. OR\nMaterials contain a few minor errors when presenting SEPS or CCCs. OR\nAssessments contain a few minor errors when assessing DCIS, SEPs or CCCs." },
                                    { "score": 0, "text": "Materials contain major errors in presenting any of the dimensions. OR\nMaterials present any of the dimensions in a scientifically inaccurate manner. OR\nAssessments present any of the dimensions in a scientifically inaccurate manner." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials."
                                    ],
                                    "recordEvidence": [
                                        "Determine whether the materials present DCIs, SEPs, CCCs, and associated elements in a scientifically accurate manner.",
                                        "Determine whether assessments present DCIs, SEPs, CCCs, and associated elements in a scientifically accurate manner.",
                                        "If errors are present, determine what type of error is present.\n  o Major errors could lead to student misconceptions that would hinder learning in this grade-band or beyond, including generalizations that oversimplify content beyond making it accessible to the grade-level/band.\n  o Minor errors could consist of typos or generalizations that include a presentation of a science topic that oversimplifies the content but would not lead to a major misconception by students and are appropriate for the grade-level/band."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How often do the materials present each dimension and its elements in a scientifically accurate manner?",
                                        "How often do the assessments present each dimension and its elements in a scientifically accurate manner?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '2e',
                            name: '2e. Materials do not inappropriately include scientific content and ideas outside of the grade-band Disciplinary Core Ideas.*',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials contain no instances where non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) are included as science ideas.',
                                'Materials contain few instances where scientific content or ideas are included without meaningful connections to grade-band DCIs.',
                                'Materials contain no instances of DCIs from below the grade-band that are included without meaningful connections made to the grade-band DCIs.',
                                'Materials contain no instances of content from beyond the grade-band DCIs that are included without meaningful connections made to the grade-band DCIs.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: true, // Implied by gateway progression rules
                            evidenceGuide: {
                                "indicatorName": "Materials do not inappropriately include scientific content and ideas outside of the grade-band Disciplinary Core Ideas.*",
                                "guidingQuestion": "Do the materials inappropriately include scientific content and ideas outside of the grade-band Disciplinary Core Ideas (DCIs)?",
                                "purpose": "This indicator\n• examines whether materials inappropriately include non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) as science ideas.\n• examines whether materials inappropriately include scientific content or ideas outside of the DCIs as DCIs in science.\n• examines whether materials inappropriately include DCIs from below the grade-band with no meaningful connections to the grade-band DCIs.\n• examines whether materials inappropriately include content from beyond the grade-band DCIs with no meaningful connections to the grade-band DCIs.",
                                "researchConnection": "\"Science is both a body of knowledge that represents current understanding of natural systems and the process whereby that body of knowledge has been established and is being continually extended, refined, and revised. Both elements are essential: one cannot make progress in science without an understanding of both. Likewise, in learning science one must come to understand both the body of knowledge and the process by which this knowledge is established, extended, refined, and revised.\" (Taking Science to School, p. 27)",
                                "scoringDetails": [
                                    { "score": "NOTE", "text": "This indicator is non-negotiable; materials being reviewed must score above zero points to have an opportunity to advance past Gateway 2." },
                                    { "score": 2, "text": "Materials contain no instances where non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) are included as science ideas. AND\nMaterials contain few instances where scientific content or ideas are included without meaningful connections to grade-band DCIs. AND\nMaterials contain no instances of DCIs from below the grade-band that are included without meaningful connections made to the grade-band DCIs. AND\nMaterials contain no instances of content from beyond the grade-band DCIs that are included without meaningful connections made to the grade-band DCIs." },
                                    { "score": 1, "text": "Materials contain no instances where non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) are included as science ideas. AND\nMaterials contain few instances where scientific content or ideas are included without meaningful connections to grade-band DCIs. AND/OR\nMaterials contain few instances of DCIs from below the grade-band that are inappropriately included with no meaningful connections to the grade-band DCIs. AND/OR\nMaterials contain few instances of DCIs from beyond the grade-band that are inappropriately included with no meaningful connections to the grade-band DCIs." },
                                    { "score": 0, "text": "Materials contain multiple instances where non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) are included as science ideas. OR\nMaterials contain multiple instances where scientific content or ideas are included without meaningful connections to grade-band DCIs. OR\nMaterials contain multiple instances of DCIs from below the grade-band that are inappropriately included with no meaningful connections to the grade-band DCIs. OR\nMaterials contain multiple instances of DCIs from beyond the grade-band that are inappropriately included with no meaningful connections to the grade-band DCIs." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences and learning opportunities in both student and teacher materials."
                                    ],
                                    "recordEvidence": [
                                        "Determine whether the materials include non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) as science ideas.",
                                        "Determine whether the materials inappropriately include scientific content or ideas outside of the DCIs.",
                                        "Determine whether the materials inappropriately include DCIs from below the grade-band with no meaningful connections to the grade-band DCIs.",
                                        "Determine whether the materials inappropriately include content from beyond the grade-band DCIs with no meaningful connections to the grade-band DCIs."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "Do the materials include non-scientific content or ideas (e.g., moral, societal, aesthetic, religious, existential) as science ideas?",
                                        "Do the materials inappropriately include scientific content or ideas outside of the DCIs?",
                                        "Do the materials inappropriately include DCIs from below the grade-band with no meaningful connections to the grade-band DCIs?",
                                        "Do the materials inappropriately include content from beyond the grade-band DCIs with no meaningful connections to the grade-band DCIs?"
                                    ]
                                }
                            }
                        },
                        // 2f is not an assessed indicator in High School Science.
                        {
                            id: '2g',
                            name: '2g. Materials support understanding of how the dimensions connect across contexts.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials consistently demonstrate how the dimensions connect across contexts by describing connections for students AND/OR providing support for teachers to help students understand connections.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials support understanding of how the dimensions connect across contexts.",
                                "guidingQuestion": "Are the materials designed for students to build and connect their knowledge and use of the three dimensions?",
                                "purpose": "This indicator\n• examines whether the materials connect student learning and use of the three dimensions within and/or across learning sequences.",
                                "researchConnection": "\"Science concepts build coherently across K–12. The emphasis of the NGSS is a focused and coherent progression of knowledge from grade band to grade band, allowing for a dynamic process of building knowledge throughout a student's entire K–12 science education.” (The Next Generation Science Standards, p. xiii)\n\n\"Curriculum units need to be sequenced across a year so that students can build ideas across time in coherent learning progressions, in which questions or challenges, gaps in models, and new phenomena motivate developing deeper disciplinary core and crosscutting ideas.\" (Guide to Implementing the Next Generation Science Standards, p. 53)",
                                "scoringDetails": [
                                    { "score": 2, "text": "Materials consistently demonstrate how the dimensions connect across contexts by describing connections for students AND/OR providing support for teachers to help students understand connections." },
                                    { "score": 1, "text": "Materials demonstrate how the dimensions connect across contexts by describing connections for students AND/OR providing support for teachers to help students understand connections, but not consistently." },
                                    { "score": 0, "text": "Materials do not demonstrate how the dimensions connect across contexts." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences in both student and teacher materials.",
                                        "Follow the suggested or intended sequence, if present."
                                    ],
                                    "recordEvidence": [
                                        "Describe how the DCIs, SEPs, and/or CCCs connect across contexts.",
                                        "Describe how the materials make clear (to the students and/or teachers to support students) the connections of the three dimensions across learning sequences to connect prior, current, and future learning.\n  o Connections should be explicit for students or for teachers to support students.\n  o Connections should be related to different 'topics' and a larger grain size than learning opportunity to learning opportunity.\n  o Connections are not continuations of learning. Do not identify opportunities for continuation of learning between two sequential learning opportunities."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How often do the materials demonstrate how the dimensions connect across contexts?\n  o How often are connections described explicitly for students?\n  o How often are teachers provided support to help students understand connections?",
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
                                'Student tasks related to explaining phenomena and/or solving problems consistently increase in sophistication across the course.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials are designed for student tasks related to explaining phenomena and/or solving problems to increase in sophistication.",
                                "guidingQuestion": "Are the materials designed for student tasks related to explaining phenomena and/or solving problems to increase in sophistication?",
                                "purpose": "This indicator\n• examines how student tasks related to explaining phenomena and/or solving problems increase in sophistication across the course.",
                                "researchConnection": "\"Across units, students encounter the different dimensions of a core idea within different science and engineering practices, and they encounter crosscutting concepts across investigations of different core ideas. Over time, moreover, students' understanding of core ideas and crosscutting concepts develops so that they can be presented with more complex phenomena and design challenges, and their increasing grasp of practice supports their ability to engage with these phenomena and challenges.” (Designing NGSS-Aligned Curriculum Materials, p. 11)",
                                "scoringDetails": [
                                    { "score": 2, "text": "Student tasks related to explaining phenomena and/or solving problems consistently increase in sophistication across the course." },
                                    { "score": 1, "text": "Student tasks related to explaining phenomena and/or solving problems increase in sophistication across the course, but not consistently." },
                                    { "score": 0, "text": "Student tasks related to explaining phenomena and/or solving problems increase in sophistication across the course in few to no instances." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the learning sequences in both student and teacher materials.",
                                        "Follow the suggested or intended sequence, if present."
                                    ],
                                    "recordEvidence": [
                                        "Describe how student tasks, related to explaining phenomena and/or solving problems, increase in sophistication across the course.\n  o This could include removal of supports or scaffolds over time, increase in complexity of tasks, students taking on more responsibility or independence as related to tasks, etc.\n  o Tasks must be connected to a phenomena and/or problem.",
                                        "Describe how tasks related to student engagement with the SEPs change over time."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How often do student tasks related to explaining phenomena and/or solving problems increase in sophistication across the course?",
                                        "Are there instances where the materials provide limited opportunities for students to engage with SEPs, and thus miss the opportunity to increase the sophistication of tasks?"
                                    ]
                                }
                            }
                        }
                    ]
                }
            ]
        },
        {
            id: 'gateway3',
            name: 'Gateway 3: Teacher & Student Supports',
            description: 'Materials support teachers to fully utilize the curriculum, understand the skills and learning of their students, and support a range of learners.',
            totalPoints: 18, // Sum of scored points from Criterion 3.1 (14) and 3.2 (4)
            // Thresholds are based on common EdReports patterns, as PDF shows "XX-XX".
            ratingThresholds: { meets: 15, partially: 9 }, // Assumed: Meets 15-18, Partially 9-14
            criterionSections: [
                {
                    id: 'criterion3_1',
                    name: 'Criterion 3.1: Teacher Supports',
                    description: 'Materials include opportunities for teachers to effectively plan and utilize with integrity to further develop their own understanding of the content.',
                    totalPoints: 14,
                    evidenceGuide: {
                        "purpose": "This criterion examines how the materials support teachers:\n• in delivering the student and ancillary materials, especially as it relates to students figuring out phenomena and solving problems.\n• in understanding the instructional approaches of the program and research-based strategies.\n• in improving their own knowledge of the subject beyond the grade level.\n• in making connections to college- and career-ready ELA and mathematics standards, and understanding the role of the standards in the context of the overall series.\n• in planning for effective instruction that includes appropriate materials, safety precautions, and how caregivers can support student progress and achievement.",
                        "researchConnection": "\"Curricula based on the Framework and resulting standards should integrate the three dimensions-scientific and engineering practices, crosscutting concepts, and disciplinary core ideas—and follow the progressions articulated in this report. In order to support the vision of this Framework, standards-based curricula in science need to be developed to provide clear guidance that helps teachers support students engaging in scientific practices to develop explanations and models [5, 21-24]. In addition, curriculum materials need to be developed as a multiyear sequence that helps students develop increasingly sophisticated ideas across grades K-12 [5, 25, 26].” (A Framework for K-12 Science Education, p. 246)",
                        "scoringDetails": [
                            { "score": "Meets Expectations", "text": "12-14 points" },
                            { "score": "Partially Meets Expectations", "text": "7-11 points" },
                            { "score": "Does Not Meet Expectations", "text": "<7 points" }
                        ]
                    },
                    items: [
                        {
                            id: '3a',
                            name: '3a. Materials provide teacher guidance with useful annotations and suggestions for how to enact the student materials and ancillary materials, with specific attention to engaging students in figuring out phenomena and solving problems.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials provide comprehensive guidance that will assist teachers in presenting the student and ancillary materials.',
                                'Materials include sufficient and useful annotations and suggestions that are presented within the context of the specific learning objectives.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide teacher guidance with useful annotations and suggestions for how to enact the student materials and ancillary materials, with specific attention to engaging students in figuring out phenomena and solving problems.",
                                "guidingQuestion": "Do the materials provide teacher guidance with useful annotations and suggestions for how to enact the student materials and ancillary materials, with specific attention to engaging students in figuring out phenomena and solving problems?",
                                "purpose": "This indicator examines the materials to determine whether they contain teacher guidance with sufficient and useful annotations and suggestions for how to enact the student materials and ancillary materials.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": 2, "text": "Materials provide comprehensive guidance that will assist teachers in presenting the student and ancillary materials. AND\nMaterials include sufficient and useful annotations and suggestions that are presented within the context of the specific learning objectives." },
                                    { "score": 1, "text": "Materials provide guidance that will assist teachers in presenting the student and ancillary materials. OR\nMaterials include sufficient and useful annotations and suggestions that are presented within the context of the specific learning objectives." },
                                    { "score": 0, "text": "Materials do not provide guidance that will assist them in presenting the student and ancillary materials. AND\nMaterials do not include sufficient and useful annotations and suggestions that are presented within the context of the specific learning objectives." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the materials, both print and digital (if available), across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe if and how the materials include overview sections, annotations, narrative information, or other documents that will assist the teacher in presenting the student material and/or ancillary materials.",
                                        "Describe how information and guidance provided by the materials is useful for planning instruction. Look for suggestions about instructional strategies and guidance for presenting the content (specifically how to support students in figuring out phenomena and/or solving problems), which could include identifying and addressing student naive conceptions. These are often in the planning sections as well as margin notes, but could also be in the front matter philosophy, professional development, or explanations of program components."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                            name: "3b. Materials contain explanations and examples of grade-level/course-level concepts and/or standards and how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject.",
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                "Materials contain explanations and examples of grade/course-level concepts and/or standards so that teachers can improve their own knowledge of the subject.",
                                "Materials contain explanations and examples of how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject."
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials contain explanations and examples of grade-level/course-level concepts and/or standards and how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject.",
                                "guidingQuestion": "Do the materials contain explanations and examples of grade/course-level concepts and how the concepts align with other grade/course levels so that teachers can improve their own knowledge of the subject?",
                                "purpose": "This indicator examines the materials to determine whether they deepen teacher understanding of science and engineering ideas, concepts, and practices so that teachers can improve their own knowledge of the subject.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": 2, "text": "Materials contain explanations and examples of grade/course-level concepts and/or standards so that teachers can improve their own knowledge of the subject. AND\nMaterials contain explanations and examples of how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject." },
                                    { "score": 1, "text": "Materials contain explanations and examples of grade/course-level concepts and/or standards so that teachers can improve their own knowledge of the subject. OR\nMaterials contain explanations and examples of how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject." },
                                    { "score": 0, "text": "Materials do not contain explanations and examples of grade/course-level concepts and/or standards so that teachers can improve their own knowledge of the subject. AND\nMaterials do not contain explanations and examples of how the concepts and/or standards align to other grade/course levels so that teachers can improve their own knowledge of the subject." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the materials, both print and digital (if available), across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe if and how the materials provide explanations and examples that support the teacher in developing their own understanding of the content and expected student practices.",
                                        "Describe if and how the materials provide explanations and examples of how the concepts/standards connect to other grade/course levels."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Correlation information and explanations of the role of the specific grade-level/grade-band ELA and mathematics standards are present in the context of the series.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials include standards correlation information, including connections to college- and career-ready ELA and mathematics standards, that explains the role of the standards in the context of the overall series.",
                                "guidingQuestion": "Do the materials include standards correlation information, including connections to college- and career-ready ELA and mathematics standards, that explains the role of the standards in the context of the overall series?",
                                "purpose": "This indicator examines whether materials provide documentation of how each lesson and unit correlate to the NGSS and Common Core State Standards for ELA and Mathematics and whether materials provide explanations of the role of the standards at each unit/module in the context of the overall series.",
                                "researchConnection": "\"Recommendation 12: The standards for the sciences and engineering should align coherently with those for other K-12 subjects. Alignment with the Common Core Standards in mathematics and English/language arts is especially important.\" (A Framework for K-12 Science Education, p. 306)",
                                "scoringDetails": [
                                    { "score": 2, "text": "Correlation information and explanations of the role of the specific grade-level/grade-band science standards are present in the context of the series. AND\nCorrelation information and explanations of the role of the specific grade-level/grade-band ELA and mathematics standards are present in the context of the series." },
                                    { "score": 1, "text": "Correlation information and explanations of the role of the specific grade-level/grade-band science standards are present in the context of the series, but not consistently. OR\nCorrelation information and explanations of the role of the specific grade-level/grade-band ELA or mathematics standards are present, but not consistently." },
                                    { "score": 0, "text": "Correlation information and explanations of the role of the specific grade-level/grade-band science standards are not present. OR\nCorrelation information and explanations of the role of the specific grade-level/grade-band ELA or mathematics standards are not present." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the print and digital (if available) table of contents, pacing guides, scope and sequence, and other teacher materials."
                                    ],
                                    "recordEvidence": [
                                        "Describe how and where teacher materials provide NGSS standards correlations for science. Note at what level (unit, lesson, activity) these correlations are provided.",
                                        "Describe how and where teacher materials provide an explanation for the role of these NGSS standards in the context of the overall series. Note at what level (unit, lesson, activity) these explanations are provided.",
                                        "Describe how and where teacher materials provide standards correlation information to applicable Common Core ELA and Mathematics Standards. Note at what level (unit, lesson, activity) these correlations are provided.",
                                        "Describe how and where teacher materials provide an explanation for the role of these Common Core ELA and Mathematics Standards in the context of the overall series. Note at what level (unit, lesson, activity) these explanations are provided.",
                                        "Note:\n• if standards correlation is inaccurate.\n• if information is included to allow the teacher to make prior connections and teach for connections to future content."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                            scoringOptions: [],
                            scoringCriteria: [
                                'Materials contain strategies for informing students, parents, or caregivers about the program.',
                                'Materials contain suggestions for how parents or caregivers can help support student progress and achievement.',
                                'Materials for parents and caregivers (like letters home) have been translated into languages other than English.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide strategies for informing all stakeholders, including students, parents, or caregivers about the program and suggestions for how they can help support student progress and achievement.",
                                "guidingQuestion": "Do the materials provide strategies for informing all stakeholders, including students, parents, or caregivers about the program and suggestions for how they can help support student progress and achievement?",
                                "purpose": "This indicator examines the series to determine if the materials contain strategies for informing students, parents, or caregivers about the program, and it also examines the series to determine if the materials contain suggestions for how parents or caregivers can help support student progress and achievement.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Look at both print and digital (if available) student materials and teacher materials, including beginning sections of the entire course, unit, chapter, or lesson that contains overview sections, teacher instruction pages, or ancillary supports for a narrative explanation of the content in each topic, paying attention to key instruction that will inform others that may be assisting the student's progress."
                                    ],
                                    "recordEvidence": [
                                        "Describe where the materials contain strategies for informing students, parents, or caregivers about the science program. Look for forms of communication with parents and caregivers, including for families that may speak and read in a language other than English.",
                                        "Describe where the materials contain suggestions for how parents or caregivers can help support student progress and achievement. Look for any work that notes a school-to-home connection."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Materials include and reference the role of the standards in the program.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide explanations of the instructional approaches of the program and identification of the research-based strategies.",
                                "guidingQuestion": "Do the materials provide explanations of the instructional approaches of the program and identification of the research-based strategies?",
                                "purpose": "This indicator examines the materials to determine whether they explain the instructional approaches of the program and whether they identify research-based strategies that have informed the design of the materials.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": 2, "text": "Materials explain the instructional approaches of the program. AND\nMaterials include and reference research-based strategies." },
                                    { "score": 1, "text": "Materials explain the instructional approaches of the program. OR\nMaterials include and reference research-based strategies." },
                                    { "score": 0, "text": "Materials do not explain the instructional approaches of the program. AND\nMaterials do not include and reference research-based strategies." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how and where the materials explain the instructional approaches of the program.",
                                        "Describe how and where the materials identify research-based strategies that are used in the design."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Materials include a comprehensive list of supplies needed to support the instructional activities.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide a comprehensive list of supplies needed to support instructional activities.",
                                "guidingQuestion": "Do the materials provide a comprehensive list of supplies needed to support instructional activities?",
                                "purpose": "This indicator examines the series to determine if the materials contain a comprehensive list of materials needed to support implementation.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": 1, "text": "Materials include a comprehensive list of supplies needed to support the instructional activities." },
                                    { "score": 0, "text": "Materials do not include a comprehensive list of supplies needed to support instructional activities." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Determine whether a comprehensive list of required materials is provided."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'The assessment system consistently provides sufficient teacher guidance for interpreting student performance and determining next instructional steps.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "The assessment system provides consistent opportunities to determine student learning throughout the school year. The assessment system provides sufficient teacher guidance for evaluating student performance and determining instructional next steps.",
                                "guidingQuestion": "Does the assessment system provide consistent opportunities to determine student learning throughout the school year? Does the assessment system provide sufficient teacher guidance for interpreting student performance and determining instructional next steps?",
                                "purpose": "This indicator examines assessments and corresponding assessment guidance across the series, including answer keys, rubrics, and other assessment scoring tools (e.g., sample student responses, scoring guidelines, and open-ended feedback), guidance for teachers to interpret student performance, and suggestions for follow-up based on student performance.",
                                "researchConnection": "\"It is possible to design assessment tasks and scoring rubrics that assess three-dimensional science learning. Such assessments provide evidence that informs teachers and students of the strengths and weaknesses of a student's current understanding, which can guide further instruction and student learning and can also be used to evaluate students' learning.” (Developing Assessments for the Next Generation Science Standards, BOTA Report, conclusion 4-3, p. 130)",
                                "scoringDetails": [
                                    { "score": 4, "text": "The assessment system consistently provides opportunities to determine student learning throughout the school year. AND\nThe assessment system consistently provides sufficient teacher guidance for evaluating student performance. AND\nThe assessment system consistently provides sufficient teacher guidance for interpreting student performance and determining next instructional steps." },
                                    { "score": 2, "text": "The assessment system provides opportunities to determine student learning throughout the school year, but not consistently. OR\nThe assessment system provides sufficient teacher guidance for evaluating student performance, but not consistently. OR\nThe assessment system provides sufficient teacher guidance for interpreting student performance and determining next instructional steps, but not consistently." },
                                    { "score": 0, "text": "The assessment system provides few to no opportunities to determine student learning throughout the school year. OR\nThe assessment system provides sufficient teacher guidance for evaluating student performance, giving feedback, and determining instructional next steps, in few to no instances. OR\nThe assessment system provides sufficient teacher guidance for interpreting student performance and determining next instructional steps, in few to no instances." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review assessments and corresponding assessment guidance across the series, including answer keys, rubrics, and other assessment scoring tools."
                                    ],
                                    "recordEvidence": [
                                        "Describe if and how assessments provide teacher guidance for evaluating student performance including tools for scoring purposes (e.g., sample student responses, rubrics, scoring guidelines, and open-ended feedback).",
                                        "Describe whether teachers are provided with guidance to interpret student understanding and respond to student needs elicited by the assessment. Record evidence about suggestions provided for the teacher to support them in determining next instructional steps (e.g., support to interpret responses, guidance on common incorrect answers, reasons why students might answer incorrectly, suggestions on possible areas to review or additional instruction)."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'Materials embed clear science safety guidelines for teachers and students across the instructional materials.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide clear science safety guidelines for teachers and students across the instructional materials.",
                                "guidingQuestion": "Do the materials provide clear science safety guidelines for teachers and students across the instructional materials?",
                                "purpose": "This indicator examines the series to determine if the materials embed clear science safety guidelines for teacher and students across the instructional materials.",
                                "researchConnection": "“Teachers also need opportunities to develop the knowledge and practices to support these investigations, including how to prepare, organize, and maintain materials; implement safety protocols; organize student groups; and guide students as they collect, represent, analyze, discuss data, argue from evidence, and draw conclusions [80].” (A Framework for K-12 Science Education, p. 258)",
                                "scoringDetails": [
                                    { "score": 1, "text": "Materials embed clear science safety guidelines for teachers and students across the instructional materials." },
                                    { "score": 0, "text": "Materials do not embed science safety guidelines for teachers and students across the instructional material." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how and where the materials embed clear science safety guidelines for teachers and students."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How and where do the materials embed clear science safety guidelines for teachers and students?",
                                        "Are the guidelines present across the materials?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '3i',
                            name: '3i. Materials designated for each grade are feasible and flexible for one school year.',
                            scoringOptions: [],
                            scoringCriteria: [
                                'Materials designated for each grade are feasible and flexible for one school year.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials designated for each grade are feasible and flexible for one school year.",
                                "guidingQuestion": "Are the materials designated for each grade feasible and flexible for one school year?",
                                "purpose": "This indicator examines the materials to determine if the amount of time suggested in the materials for each grade is appropriate for a school year, if the expectations of the materials are reasonable for both teachers and students to complete in the suggested timeframe, and if the materials provide guidance to adjust to fit a range of instructional times or different schedules.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the materials across the series, including the table of contents, any pacing guides, and scope and sequence provided by the publisher."
                                    ],
                                    "recordEvidence": [
                                        "Describe how the materials within each lesson or unit allow students to learn at an appropriate pace for the given grade level.",
                                        "Identify whether students should be able to master all the content designated for the grade level.",
                                        "(K-5 only) Describe how the materials provide guidance on adjustments to fit districts with different needs based on time restrictions, including rationale on what can be cut, including tradeoffs and how materials provide support for adjusting to fit different schedules and blocks available for teaching science.",
                                        "Describe how the materials are designed with an intentional sequence or suggested sequence and/or guidance on how to intentionally sequence (when modular in design).",
                                        "Note: If the publishers do not provide recommended pacing or structure, assume 1/3 of the materials for a grade band constitute one year."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "Do the materials within each lesson or unit allow students to learn at an appropriate pace for the given grade level?",
                                        "Will students be able to master all of the content designated for the grade level?",
                                        "Do the materials provide guidance to adjust for a range of district constraints (time and scheduling)?",
                                        "Are the materials designed with an intentional sequence or suggested sequence and/or guidance on how to intentionally sequence (when modular in design)?"
                                    ]
                                }
                            }
                        }
                    ]
                },
                {
                    id: 'criterion3_2',
                    name: 'Criterion 3.2: Student Supports',
                    description: "Materials are designed for each child's regular and active participation in grade-level/grade-band/series content.",
                    totalPoints: 4,
                    evidenceGuide: {
                        "purpose": "This criterion examines how the materials:\n• leverage diverse cultural and social backgrounds of students.\n• provide appropriate support, accommodations, and modifications for special populations that support regular and active participation in learning science and engineering.\n• provide multiple access points for students at varying ability levels to make sense of phenomena and design solutions to problems.\n• include multi-modal opportunities for students to share their thinking.\n• represent people of various demographic and physical characteristics.\n• provide opportunities for teachers to use a variety of grouping strategies.\n• are made accessible by providing appropriate supports for different reading levels.",
                        "researchConnection": "\"Inclusive instructional strategies encompass a range of techniques and approaches that build on students' interests and backgrounds so as to engage them more meaningfully and support them in sustained learning. These strategies, which also have been shown to promote educational equity in learning science and engineering, must be attended to as standards are translated into curriculum, instruction, and assessment.\" (A Framework for K-12 Science Education, p. 283)",
                        "scoringDetails": [
                            { "score": "Meets Expectations", "text": "4 points" },
                            { "score": "Partially Meets Expectations", "text": "2-3" },
                            { "score": "Does Not Meet Expectations", "text": "<2 points" }
                        ]
                    },
                    items: [
                        {
                            id: '3j',
                            name: '3j. Materials provide strategies and supports for students in special populations to work with grade-level content and meet or exceed grade-level standards, which support their regular and active participation in learning grade-level/band science and engineering.',
                            scoringOptions: [0, 1, 2],
                            scoringCriteria: [
                                'Materials regularly provide strategies, supports, and resources for students in special populations to support their regular and active participation and engagement in grade-level/grade-band science and engineering.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide strategies and supports for students in special populations to support their regular and active participation in learning grade-level/grade-band science and engineering.",
                                "guidingQuestion": "What opportunities are there for students in special populations to engage with materials to support ongoing participation in grade-level/grade-band science and engineering content?",
                                "purpose": "This indicator examines whether the materials provide strategies, supports, and resources for students in special populations to support their regular and active participation in grade-level/grade-band science and engineering.",
                                "researchConnection": "For this indicator, special populations refers to students that must overcome barriers that may require special consideration and attention to ensure equal opportunity for success and in an educational setting. This could include:\n• Disabilities: Physical, developmental, behavioral, or emotional disabilities\n• Economic disadvantage: Low-income families, homelessness, or out-of-workforce individuals\n• Other circumstances: Preparing for non-traditional fields, single parents, English language learners, or racial and ethnic minorities",
                                "scoringDetails": [
                                    { "score": 2, "text": "Materials regularly provide strategies, supports, and resources for students in special populations to support their regular and active participation and engagement in grade-level/grade-band science and engineering." },
                                    { "score": 1, "text": "Materials do not regularly provide strategies, supports, and resources for students in special populations to support their regular and active participation and engagement in grade-level/grade-band science and engineering." },
                                    { "score": 0, "text": "There are no strategies, supports, or resources for students in special populations to support their regular and active participation and engagement in grade-level/grade-band science and engineering." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher and student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe where and how the materials provide specific strategies and supports for differentiating instruction to meet the needs of students in special populations.",
                                        "Identify whether the materials support students in special populations in regular and active participation in grade-level/grade-band science and engineering and include any instances where differentiation does not present opportunities to engage students in the work of the grade level/grade band.",
                                        "Note: There must be more than a statement at the beginning of the chapter or lesson that is generic or states that the same strategy could be used with every lesson."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                                'No instances of advanced students doing more assignments than their classmates.'
                            ],
                            isNarrativeOnly: false,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide extensions and/or opportunities for students to engage in learning grade-level/grade-band science and engineering at greater depth.",
                                "guidingQuestion": "What opportunities are present for students to engage in learning with grade-level/grade-band science and engineering at higher levels of complexity? Are the opportunities that are present purposeful investigations or extensions? Do the opportunities extend learning of the grade-level content or topic?",
                                "purpose": "This indicator examines the materials to determine whether the materials provide opportunities for advanced students to engage in grade-level/grade-band science at a higher level of complexity.",
                                "researchConnection": "\"Arguably, the most pressing challenge facing U.S. education is to provide all students with a fair opportunity to learn.\" (A Framework for K-12 Science Education, p. 282)",
                                "scoringDetails": [
                                    { "score": 2, "text": "Materials provide multiple opportunities for advanced students to engage in grade-level/grade-band science at a higher level of complexity. AND\nNo instances of advanced students doing more assignments than their classmates." },
                                    { "score": 1, "text": "Materials provide some opportunities for advanced students to engage in grade-level/grade-band science at a higher level of complexity. AND\nThere are few instances of advanced students doing more assignments than their classmates." },
                                    { "score": 0, "text": "Materials provide few, if any, opportunities for advanced students to engage in grade-level/grade-band science at a higher level of complexity. OR\nThere are many instances of advanced students doing more assignments than their classmates." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review the student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how and where advanced students have opportunities to work at a higher level of complexity with the three dimensions to make sense of phenomena and design solutions to problems. Note - this is not students completing additional tasks or more work, but is an extension of their learning.",
                                        "Identify strategies and supports for advanced students to explore grade-level/grade-band content at a higher level of complexity."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                            scoringOptions: [],
                            scoringCriteria: [
                                'Materials provide varied tasks for students to show their thinking and make meaning.',
                                'Students have opportunities to share their thinking, to demonstrate changes in their thinking over time, and to apply their understanding in new contexts.',
                                'Materials leverage the use of a variety of formats over time to deepen student understanding and ability to explain and apply literacy ideas.',
                                'Materials provide for ongoing review, practice, self-reflection, and feedback. Materials provide multiple strategies, such as oral and/or written feedback, peer or teacher feedback, and self-reflection.',
                                'Materials provide a clear path for students to monitor and move their own learning.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide varied approaches to learning tasks over time and variety in how students are expected to demonstrate their learning with opportunities for students to monitor their learning.",
                                "guidingQuestion": "What approaches to presentation of material are provided? What approaches are provided for students to demonstrate their learning? Do the approaches to presentation and demonstration of learning vary over the course of the year?",
                                "purpose": "This indicator examines the materials for a variety of approaches to learning tasks over the grade level and grade band, a variety of opportunities for students to demonstrate their learning over time, opportunities for students to receive oral and/or written peer or teacher feedback, and opportunities for students to monitor and move their learning.",
                                "researchConnection": "\"For students who need to take more time to express their understanding (e.g., if they learned English as their second language), opportunities to edit or to display their knowledge in less language-embedded tasks would help level the playing field.” (A Framework for K-12 Science Education, p. 289)",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher and student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how and where the materials provide multi-modal opportunities for students to question, investigate, sense-make, and problem-solve using a variety of formats and methods.",
                                        "Describe how and where students have opportunities to share their thinking, to demonstrate changes in their thinking over time, and to apply their understanding in new contexts.",
                                        "Describe how the program leverages the use of a variety of formats and methods over time to deepen student understanding and ability to explain and apply science ideas.",
                                        "Describe if and how materials provide for ongoing review, practice, self-reflection, and feedback.",
                                        "Describe if and how materials provide multiple strategies, such as oral and/or written feedback, peer or teacher feedback, and self-reflection.",
                                        "Describe if and how materials provide a clear path for students to monitor and move their own learning."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                            scoringOptions: [],
                            scoringCriteria: [
                                'Materials provide grouping strategies for students.',
                                'Materials provide guidance for varied types of interaction among students.',
                                'Materials provide guidance for the teacher on grouping students in a variety of grouping formats.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide opportunities for teachers to use a variety of grouping strategies.",
                                "guidingQuestion": "Do the materials provide opportunities for teachers to use a variety of grouping strategies?",
                                "purpose": "This indicator examines the materials to determine the types and frequency of grouping strategies for teachers to use and to determine if guidance is provided to teachers on how and when to use specific grouping strategies.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher and student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how and where the materials provide grouping strategies for students.",
                                        "Describe how and where the materials provide for interaction among students and the types of interactions provided.",
                                        "Describe how and where the materials provide guidance for the teacher on grouping students in a variety of grouping formats.",
                                        "Note: If you identify grouping strategies specifically targeted to differentiated populations, please assign that evidence to the associated indicators (special populations will be in 3j; advanced students in 3k; MLL learners in 3m.MLL)."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                            scoringOptions: [],
                            scoringCriteria: [
                                'Materials offer accommodations that ensure all students can access the assessment (e.g., text-to-speech, increased font size) without changing its content.',
                                'Materials include guidance for teachers on the use of provided accommodations.',
                                'Materials include guidance for teachers about who can benefit from these accommodations.',
                                'Materials do not include modifications to assessments that alter grade level/expectations.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Assessments offer accommodations that allow students to demonstrate their knowledge and skills without changing the content of the assessment.",
                                "guidingQuestion": "Do the assessments offer accommodations that allow students to demonstrate their knowledge and skills without changing the content of the assessment?",
                                "purpose": "This indicator examines the series' assessments and assessment guidance documentation to determine what accommodations are available.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review assessments and corresponding assessment guidance across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe where and how accommodations are offered that ensure all students can access the assessment, (e.g. text-to-speech, increased font size, etc.) without changing the content of the assessment.",
                                        "Describe any guidance for teachers on the use of provided accommodations.",
                                        "Describe whether any accommodations alter grade-level/course expectations or the content of the assessment for students."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "Where and how do the assessments provide accommodations for students?",
                                        "Where and how is guidance provided for teachers to use the accommodations?",
                                        "Do accommodations alter grade-level/course expectations for students?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '3o',
                            name: "3o. Materials provide a range of representation of people and include detailed instructions and support for educators to effectively incorporate and draw upon students' different cultural, social, and community backgrounds to enrich learning experiences.",
                            scoringOptions: [],
                            scoringCriteria: [
                                "Materials provide a range of representation of people, ensuring a broad range of cultural, racial, gender, and ability backgrounds are accurately and authentically represented.",
                                "Materials provide detailed instructions and support for teachers on incorporating and drawing upon students' different cultural, social, and community backgrounds to enrich learning experiences."
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide a range of representation of people and include detailed instructions and support for educators to effectively incorporate and draw upon students' different cultural, social, and community backgrounds to enrich learning experiences.",
                                "guidingQuestion": "Do the materials provide guidance and a range of representation of people that supports educators in leveraging students' cultural, social, and community backgrounds to enhance learning?",
                                "purpose": "This indicator examines whether materials reflect diverse identities, connect learning to real-world and culturally relevant contexts, and promote student engagement through authentic representation, high expectations, and community involvement. In doing so, the indicator supports communities in engaging in deep discourse and aligning educational practices with their local contexts.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher and student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how the materials reflect and affirm the diverse identities of students, ensuring a broad range of cultural, racial, gender, and ability backgrounds are accurately and authentically represented.",
                                        "Describe images and representations that depict students actively participating in learning experiences that are connected to real-world contexts.\n  o These should include diverse identities of students collaborating, problem-solving, or exploring concepts in ways that highlight their cultural and personal identities. Explicitly note if these images show students of different backgrounds in leadership roles, working together in a variety of group settings, and utilizing culturally relevant tools or methods.",
                                        "Describe specific examples where instructional content is linked to students' cultural experiences, interests, or community knowledge, fostering a deeper engagement and understanding of (Mathematics, ELA, or Science).",
                                        "Identify instructional guidance that encourages high expectations for all students, including those that differentiate learning to meet diverse cultural needs while maintaining academic rigor.",
                                        "Identify prompts that invite students to draw from their cultural backgrounds and personal experiences, enhancing their connection to the material and fostering a deeper sense of identity within the learning environment.",
                                        "Describe any other teacher materials that include guidance on how to actively involve community and family perspectives, drawing on local knowledge and cultural practices to enrich the learning experiences and promote students' role as contributors to their communities."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "Do the materials include a wide range of student identities represented, reflecting the diversity of the classroom and broader society?\n  o Do these portrayals challenge stereotypes and offer diverse narratives that contribute to an inclusive learning environment?",
                                        "How and where does instructional guidance actively connect to students' cultural knowledge and lived experiences, promoting meaningful learning?",
                                        "How and where do materials include specific strategies to ensure that all students have the opportunity to engage deeply with the content, regardless of their cultural background?\n  o Do these strategies enhance the relevance of classroom content by drawing on the experiences, values, and resources of students' families and communities?",
                                        "How often do materials include adaptable approaches that cater to different cultural contexts?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '3p',
                            name: '3p. Materials provide supports for different reading levels to ensure accessibility for students.',
                            scoringOptions: [],
                            scoringCriteria: [
                                'Materials identify strategies to engage students in reading and accessing grade-level/grade-band science.',
                                'Materials identify multiple entry points to help struggling readers access and engage in grade-level/grade-band science.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide supports for different reading levels to ensure accessibility for students.",
                                "guidingQuestion": "Do the materials provide supports for different reading levels to ensure accessibility for students?",
                                "purpose": "This indicator examines the materials to determine if supports are present for a range of student reading levels to work with grade-level/grade-band science and engineering and to determine if the materials indicate the reading levels for informational text-based components.",
                                "researchConnection": "\"Students' preparation in other subjects, especially literacy and mathematics, also affects their achievement in science. If some groups of students fail to become effective readers and writers by late elementary school, teachers have difficulty helping them to make progress-not only in science but also across all subject areas. These students fall further behind, and the problem for teachers grows more complex and challenging. Such dynamics can, in effect, reinforce the low-expectation tracking of students as they move through school, thereby significantly reducing their access to science and engineering pathways through K-12 and limiting the possibility of their going to college.\" (A Framework for K-12 Science Education, p. 279)",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher and student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how and where the materials provide all students, including those who read, write, speak, or listen below grade level, opportunities to work with grade-level text.",
                                        "Describe whether materials provide the reading levels for informational text components."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How and where do the materials include specific supports or strategies to modify lessons or activities for students who read, write, speak, or listen below grade level?",
                                        "Where do the materials provide scaffolds or supports to support academic and/or disciplinary vocabulary or concept development?",
                                        "Do the materials provide teachers and students with purposeful and targeted activities for learning how to read typical scientific texts, for example, identifying evidence?",
                                        "Do materials include “just-right\" pre-reading activities that offer visuals and other types of supports and scaffolds for building essential and pertinent background knowledge on new or unfamiliar themes/ topics?"
                                    ]
                                }
                            }
                        }
                        // 3q is not an assessed indicator in Science.
                    ]
                },
                {
                    id: 'criterion3_3',
                    name: 'Criterion 3.3: Intentional Design',
                    description: 'Materials include a visual design that is engaging and references or integrates digital technology, when applicable, with guidance for teachers.',
                    totalPoints: 0, // All items are narrative only
                    evidenceGuide: {
                        "purpose": "This criterion:\n• examines how the materials integrate digital technology and interactive tools to support student engagement in the three dimensions of science.\n• examines how the materials use digital technology to provide collaborative opportunities for teachers and/or students.\n• examines how the embedded technology and visual design supports student engagement and learning.",
                        "researchConnection": "",
                        "scoringDetails": [
                            { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this criterion. Only qualitative evidence is provided." }
                        ]
                    },
                    items: [
                        {
                            id: '3r',
                            name: '3r. Materials integrate technology such as interactive tools, virtual manipulatives/objects, and/or dynamic software in ways that engage students in the grade-level/series standards, when applicable.',
                            scoringOptions: [],
                            scoringCriteria: [
                                'Digital technology and interactive tools, such as data collection tools and/or modeling tools are available to students.',
                                'Digital tools support student engagement in mathematics. (Note: PDF says "mathematics", assuming science context or general STEM engagement)',
                                'Digital materials can be customized for local use (i.e., student and/or community interests).'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials integrate interactive tools and/or dynamic software in ways that support student engagement in the three dimensions, when applicable.",
                                "guidingQuestion": "Do the materials integrate interactive tools and/or dynamic software in ways that support student engagement in the three dimensions, when applicable?",
                                "purpose": "This indicator examines whether materials integrate interactive tools and/or dynamic software in ways that support student engagement in the three dimensions of science and is applicable to materials with digital components only.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher and student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe if and how digital technology and interactive tools, such as data collection tools, simulations, and/or modeling tools are available to students.",
                                        "Describe if and how included digital tools support student engagement in the three dimensions of science.",
                                        "Describe if and how digital materials can be customized for local use (i.e., to embed local phenomena and problems)."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                            scoringOptions: [],
                            scoringCriteria: [
                                'Materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other, when applicable.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other, when applicable.",
                                "guidingQuestion": "Do the materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other, when applicable?",
                                "purpose": "This indicator examines the series to determine if the materials provide opportunities and guidance for teachers and/or students to collaborate with each other and is applicable to materials with digital components only.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher and student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how and where the materials include or reference digital technology that provides opportunities for teachers and/or students to collaborate with each other.",
                                        "Describe which stakeholders the materials support collaboration between: teacher to teacher, teacher to student, or student to student."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "How and where do the materials provide opportunities for online or digital collaboration?",
                                        "How and where do the materials provide opportunities for students to collaborate with the teacher and/or with other students?"
                                    ]
                                }
                            }
                        },
                        {
                            id: '3t',
                            name: '3t. The visual design (whether in print or digital) supports students in engaging thoughtfully with the subject, and is neither distracting nor chaotic.',
                            scoringOptions: [],
                            scoringCriteria: [
                                'Images, graphics, and models support student learning and engagement without being visually distracting. They also clearly communicate information or support student understanding of topics, texts, or concepts.',
                                'Teacher and student materials are consistent in layout and structure across lessons/modules/units.',
                                "Materials' organizational features (table of contents, glossary, index, internal references, table headers, captions, etc.) are clear, accurate, and error-free."
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "The visual design (whether in print or digital) supports students in engaging thoughtfully with the subject, and is neither distracting nor chaotic.",
                                "guidingQuestion": "Does the visual design (whether in print or digital) support students in engaging thoughtfully with the subject, and is neither distracting nor chaotic?",
                                "purpose": "This indicator examines the visual design to determine if images, graphics, and models support student learning and engagement, without being visually distracting; examines for consistency in layout of the teacher and student materials; examines resources to determine whether they clearly communicate information; and examines resources to determine whether they contain any errors as they relate to usability.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher and student materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe how images, graphics, and models support student learning and engagement without being visually distracting.",
                                        "Describe whether teacher and student materials are consistent in layout and structure across lessons/modules/units.",
                                        "Describe if and how the images, graphics, and models clearly communicate information or support student understanding of topics, texts, or concepts.",
                                        "Identify any errors in the resources related to usability."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
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
                            scoringOptions: [],
                            scoringCriteria: [
                                'Teacher guidance is provided for the use of embedded technology to support and enhance student learning, when applicable.'
                            ],
                            isNarrativeOnly: true,
                            isNonNegotiable: false,
                            evidenceGuide: {
                                "indicatorName": "Materials provide teacher guidance for the use of embedded technology to support and enhance student learning, when applicable.",
                                "guidingQuestion": "Do the materials provide teacher guidance for the use of embedded technology to support and enhance student learning, when applicable?",
                                "purpose": "This indicator examines the materials to determine whether they provide teacher guidance for the use of embedded technology to support and enhance student learning and is applicable to materials with digital components only.",
                                "researchConnection": "",
                                "scoringDetails": [
                                    { "score": "N/A", "text": "Scoring: Narrative Evidence Only\nNote: No score is given for this indicator. Only qualitative evidence is provided." }
                                ],
                                "evidenceCollection": {
                                    "locationsToReview": [
                                        "Review teacher materials across the series."
                                    ],
                                    "recordEvidence": [
                                        "Describe where and how the materials provide guidance for using embedded technology to support and enhance student learning, where applicable."
                                    ]
                                },
                                "clusterMeeting": {
                                    "questions": [
                                        "Where and how do teacher materials provide guidance for using embedded technology to support and enhance student learning, where applicable?"
                                    ]
                                }
                            }
                        }
                    ]
                }
            ]
        }
    ],
    finalRatingLogic: [
        {
            condition: (gatewayRatings, itemScores) => {
                // Check Gateway 1 rating
                if (gatewayRatings.gateway1 === 'Does Not Meet Expectations') return true;

                // Check Gateway 2 non-negotiable indicators 2d and 2e
                // Full path to scores: gatewayId.criterionSectionId.itemId
                if (itemScores['gateway2.criterion2_1.2d'] === 0 || itemScores['gateway2.criterion2_1.2e'] === 0) return true;

                // Check Gateway 2 rating (if non-negotiables passed)
                if (gatewayRatings.gateway2 === 'Does Not Meet Expectations') return true;
                
                return false;
            },
            result: 'Does Not Meet Expectations'
        },
        {
            condition: (gatewayRatings) =>
                gatewayRatings.gateway1 === 'Meets Expectations' &&
                gatewayRatings.gateway2 === 'Meets Expectations' &&
                gatewayRatings.gateway3 === 'Meets Expectations',
            result: 'Meets Expectations'
        },
        {
            // Default to Partially Meets if not DNM and not all Meets
            // This covers scenarios where:
            // - G1 or G2 is Partially Meets (preventing G3 review or capping overall rating)
            // - G1 and G2 are Meets, but G3 is Partially Meets or Does Not Meet
            condition: (gatewayRatings) => true,
            result: 'Partially Meets Expectations'
        }
    ]
};

console.log("Science High School Rubric Loaded:", window.rubrics['science-hs']);