"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Github, 
  Linkedin, 
  Mail, 
  MapPin, 
  Award,
  Code,
  Database,
  Palette,
  Shield,
  Zap,
  Heart,
  Users,
  Coffee,
  Lightbulb
} from "lucide-react"

interface TeamMember {
  id: string
  name: string
  role: string
  specialization: string
  bio: string
  avatar: string
  skills: string[]
  achievements: string[]
  social: {
    github?: string
    linkedin?: string
    email?: string
  }
  color: string
  bgColor: string
  icon: React.ReactNode
}

const teamMembers: TeamMember[] = [
  {
    id: "founder",
    name: "Raunak Singh",
    role: "Founder & Lead Developer",
    specialization: "Full-Stack Development & Feature Architecture",
    bio: "Built and managed most of the project features end-to-end. Passionate about solving real-world problems with scalable, practical solutions.",
    avatar: "👨‍💻",
    skills: ["React/Next.js", "TypeScript", "System Design", "MySQL", "Cloud Architecture"],
    achievements: [
      "Built project from concept to production",
      "Designed scalable architecture for growth",
      "Developed majority of core features",
      "Led the team from idea to execution"
    ],
    social: {
      github: "https://github.com/raunakcodes",
      linkedin: "https://linkedin.com/in/raunak-singh",
      email: "raunak@example.com"
    },
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: <Code className="w-5 h-5" />
  },
  {
    id: "ai-lead",
    name: "Yask Tiwaari",
    role: "Frontend Developer",
    specialization: "Front end UI design & Development",
    bio: "Focuses on building responsive, user-friendly applications with clean UI and robust backend integration.",
    avatar: "🤖",
    skills: ["React", "Next.js", "Tailwind CSS", "UI/UX Design"],
    achievements: [
      "Developed responsive UI components",
      "Implemented design systems for consistency",
      "Explored data-driven improvements",
      "Enhanced platform with user insights"
    ],
    social: {
      linkedin: "https://linkedin.com/in/chinmay",
      email: "chinmay@example.com"
    },
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: "backend-dev",
    name: "Rishit Singh",
    role: "Backend Developer",
    specialization: "Feature Development & Continuous Improvement",
    bio: "Dedicated developer who keeps on adding new features and improving existing ones to refine the project experience.",
    avatar: "👨‍💼",
    skills: ["Typescript", "Node.js", "API Development", "MySQL"],
    achievements: [
      "Built and improved platform features",
      "Optimized performance and stability",
      "Enhanced codebase with new modules",
      "Iterated quickly on feature feedback"
    ],
    social: {
      github: "https://github.com/sumit",
      linkedin: "https://linkedin.com/in/sumit",
      email: "sumit@example.com"
    },
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: <Database className="w-5 h-5" />
  },
  {
    id: "ui-designer",
    name: "Deepesh Sonar",
    role: "Presentation & Operations Lead",
    specialization: "Non-Technical Coordination & Presentation Design",
    bio: "Handles presentations, operations, and non-tech workflows to ensure smooth communication and delivery.",
    avatar: "📝",
    skills: ["Presentation Design", "Research", "Coordination", "Documentation"],
    achievements: [
      "Created team presentations for events",
      "Organized non-technical workflows",
      "Improved communication and clarity",
      "Managed documentation and reporting"
    ],
    social: {
      linkedin: "https://linkedin.com/in/deepesh",
      email: "deepesh@example.com"
    },
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    icon: <Palette className="w-5 h-5" />
  },
  {
    id: "security-expert",
    name: "Sakshi Singh",
    role: "Operations & Outreach",
    specialization: "Coordination & Non-Tech Support",
    bio: "Works alongside Deepesh to manage non-technical tasks, presentations, and outreach for the project.",
    avatar: "🙋‍♀️",
    skills: ["Documentation", "Presentation", "Research"],
    achievements: [
      "Collaborated on project presentations",
      "Assisted in outreach and team tasks",
      "Helped streamline non-tech workflows",
      "Supported operational goals"
    ],
    social: {
      linkedin: "https://linkedin.com/in/sakshi",
      email: "sakshi@example.com"
    },
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: "community-manager",
    name: "Navneet Singh",
    role: "Research & Insights Manager",
    specialization: "Trends & Market Awareness",
    bio: "Keeps the team updated with the latest insights, technology news, and civic engagement trends to guide project direction.",
    avatar: "📰",
    skills: ["Research", "Analysis", "Communication", "Strategy"],
    achievements: [
      "Provided tech and civic trend updates",
      "Aligned project with current innovations",
      "Contributed strategic insights",
      "Strengthened research-driven decision making"
    ],
    social: {
      linkedin: "https://linkedin.com/in/yash",
      email: "yash@example.com"
    },
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    icon: <Users className="w-5 h-5" />
  }
]


const companyValues = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Civic Impact",
    description: "Every line of code serves the community",
    color: "text-red-500 bg-red-100"
  },
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: "Innovation",
    description: "Pushing boundaries with cutting-edge technology",
    color: "text-yellow-500 bg-yellow-100"
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Transparency",
    description: "Open processes and accountable governance",
    color: "text-blue-500 bg-blue-100"
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Inclusivity",
    description: "Technology accessible to all community members",
    color: "text-green-500 bg-green-100"
  }
]

export function TeamSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 bg-white/80 backdrop-blur-sm">
            Our Team
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Meet the Minds Behind CivicResolve
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A passionate team of technologists, designers, and civic advocates 
            working together to transform how communities address local challenges.
          </p>
        </motion.div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 50, rotateY: 180 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ 
                scale: 1.02, 
                y: -10,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
              className="perspective-1000"
            >
              <Card className="h-full bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 border-0 overflow-hidden group">
                <CardContent className="p-6">
                  {/* Avatar and Basic Info */}
                  <div className="text-center mb-6">
                    <motion.div
                      className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-4xl mb-4 mx-auto shadow-lg"
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      {member.avatar}
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {member.name}
                    </h3>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${member.bgColor} ${member.color}`}>
                      {member.icon}
                      {member.role}
                    </div>
                    <p className="text-sm text-gray-600 mt-2 font-medium">
                      {member.specialization}
                    </p>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">
                    {member.bio}
                  </p>

                  {/* Skills */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Core Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((skill, skillIndex) => (
                        <motion.span
                          key={skill}
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 + skillIndex * 0.02 }}
                          className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors"
                        >
                          {skill}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  {/* Key Achievements */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      Key Achievements
                    </h4>
                    <div className="space-y-2">
                      {member.achievements.slice(0, 2).map((achievement, achIndex) => (
                        <motion.div
                          key={achIndex}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + achIndex * 0.05 }}
                          className="flex items-start gap-2 text-xs text-gray-600"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${member.bgColor.replace('bg-', 'bg-').replace('-100', '-400')} mt-1.5 shrink-0`}></div>
                          <span>{achievement}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-100">
                    {member.social.github && (
                      <motion.a
                        href={member.social.github}
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Github className="w-4 h-4 text-gray-600" />
                      </motion.a>
                    )}
                    {member.social.linkedin && (
                      <motion.a
                        href={member.social.linkedin}
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                      >
                        <Linkedin className="w-4 h-4 text-blue-600" />
                      </motion.a>
                    )}
                    {member.social.email && (
                      <motion.a
                        href={`mailto:${member.social.email}`}
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                      >
                        <Mail className="w-4 h-4 text-green-600" />
                      </motion.a>
                    )}
                  </div>

                  {/* Hover background effect */}
                  <motion.div
                    className={`absolute inset-0 ${member.bgColor} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                    initial={false}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Company Values */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Our Core Values
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {companyValues.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-center p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <motion.div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${value.color}`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  {value.icon}
                </motion.div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {value.title}
                </h4>
                <p className="text-gray-600 text-sm">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}