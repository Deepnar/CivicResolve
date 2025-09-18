"use client"

import { useEffect, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { 
  MapPin, Users, MessageSquare, BarChart3, Shield, Zap, 
  Database, Globe, Smartphone, Brain, Heart, Sparkles,
  CheckCircle, ArrowRight, Star, Award, Target, TrendingUp,
  Bot, Search, Bell, UserCheck, Building2, Mail,
  Code, Cpu, Lock, Eye, Activity, Cloud
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HeroSection } from "@/components/about/hero-section"
import { FeatureShowcase } from "@/components/about/feature-showcase"
import { TechStackGrid } from "@/components/about/tech-stack-grid"
import { WorkflowDiagram } from "@/components/about/workflow-diagram"
import { ArchitectureDiagram } from "@/components/about/architecture-diagram"
import { StatsCounter } from "@/components/about/stats-counter"
import { InteractiveDemo } from "@/components/about/interactive-demo"
import { TeamSection } from "@/components/about/team-section"

export default function AboutPage() {
  const { scrollYProgress } = useScroll()
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <motion.div 
        className="absolute inset-0 opacity-30"
        style={{ y: backgroundY }}
      >
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full blur-3xl opacity-20" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-green-300 rounded-full blur-3xl opacity-20" />
      </motion.div>

      <div className="relative z-10">
        {/* Hero Section */}
        <HeroSection />

        {/* Statistics Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <Badge variant="outline" className="mb-4 bg-white/80 backdrop-blur-sm">
                Production-Ready Platform
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Built for Scale and Performance
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                CivicResolve is a comprehensive civic engagement platform that bridges 
                the gap between citizens and local government with cutting-edge technology. (MOCK DATA)
              </p>
            </motion.div>

            <StatsCounter />
          </div>
        </section>

        {/* Feature Showcase */}
        <FeatureShowcase />

        {/* Interactive Demo */}
        <InteractiveDemo />

        {/* Workflow Diagram */}
        <WorkflowDiagram />

        {/* Technology Stack */}
        <TechStackGrid />

        {/* Architecture Overview */}
        <ArchitectureDiagram />

        {/* Team & Vision */}
        <TeamSection />

        {/* Call to Action */}
        <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold mb-6">
                Ready to Transform Your Community?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of citizens already using CivicResolve to make their communities better.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="https://civic.raunakcodes.me/register" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
                    <Users className="mr-2 h-5 w-5" />
                    Get Started Today
                  </Button>
                </a>
                <a href="https://civic.raunakcodes.me/login" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Code className="mr-2 h-5 w-5" />
                    Login
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  )
}