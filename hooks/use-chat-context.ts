"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export interface ChatContext {
  page: string;
  pageName: string;
  issueId?: string;
  userId?: string;
  features?: string[];
  helpTopics?: string[];
}

export function useChatContext(): ChatContext {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    // Extract page information
    const segments = pathname.split('/').filter(Boolean);
    const page = segments[0] || 'home';
    
    let context: ChatContext = {
      page: pathname,
      pageName: 'Home',
      features: [],
      helpTopics: [],
    };

    // Page-specific context
    switch (page) {
      case 'home':
      case '':
        context = {
          ...context,
          pageName: 'Home',
          features: ['Issue reporting', 'Community overview', 'Quick navigation'],
          helpTopics: ['How to report an issue', 'Understanding issue status', 'Community engagement'],
        };
        break;

      case 'map':
        context = {
          ...context,
          pageName: 'Issue Map',
          features: ['Geographic view', 'Issue filtering', 'Location-based reporting'],
          helpTopics: ['Using the map interface', 'Filtering issues by category', 'Understanding map markers'],
        };
        break;

      case 'report':
        context = {
          ...context,
          pageName: 'Report Issue',
          features: ['Issue submission', 'Photo upload', 'Location selection', 'Category selection'],
          helpTopics: ['How to write effective reports', 'Adding photos and location', 'Choosing the right category'],
        };
        break;

      case 'issues':
        const issueId = segments[1];
        if (issueId) {
          context = {
            ...context,
            pageName: 'Issue Details',
            issueId,
            features: ['Issue tracking', 'Community comments', 'Status updates', 'Voting'],
            helpTopics: ['Understanding issue status', 'How to comment effectively', 'Using the voting system'],
          };
        } else {
          context = {
            ...context,
            pageName: 'All Issues',
            features: ['Issue browsing', 'Filtering and sorting', 'Status tracking'],
            helpTopics: ['Finding specific issues', 'Using filters', 'Understanding issue priorities'],
          };
        }
        break;

      case 'profile':
        context = {
          ...context,
          pageName: 'User Profile',
          features: ['Profile management', 'Issue history', 'Activity tracking', 'Settings'],
          helpTopics: ['Updating profile information', 'Viewing your contributions', 'Managing notifications'],
        };
        break;

      case 'admin':
        const adminSection = segments[1];
        context = {
          ...context,
          pageName: `Admin - ${adminSection || 'Dashboard'}`,
          features: ['Analytics', 'User management', 'Issue moderation', 'System settings'],
          helpTopics: ['Reading analytics', 'Managing users', 'Moderating content', 'System administration'],
        };
        break;

      case 'login':
        context = {
          ...context,
          pageName: 'Login',
          features: ['User authentication', 'Account access'],
          helpTopics: ['Logging in', 'Password recovery', 'Account security'],
        };
        break;

      case 'register':
        context = {
          ...context,
          pageName: 'Registration',
          features: ['Account creation', 'User onboarding'],
          helpTopics: ['Creating an account', 'Verification process', 'Getting started'],
        };
        break;

      default:
        context = {
          ...context,
          pageName: 'CivicResolve',
          features: ['General platform features'],
          helpTopics: ['Platform navigation', 'Feature overview', 'Getting help'],
        };
    }

    // Add search parameters context
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    
    if (category || status || priority) {
      context.features?.push('Active filters');
      context.helpTopics?.push('Understanding filter options');
    }

    return context;
  }, [pathname, searchParams]);
}

export function getChatGreeting(context: ChatContext): string {
  const greetings: Record<string, string> = {
    'Home': "Welcome to CivicResolve! I can help you get started with reporting issues and engaging with your community.",
    'Issue Map': "I can help you navigate the issue map and understand how to use the geographic features.",
    'Report Issue': "I'm here to guide you through the issue reporting process. Let me know if you need help with any step!",
    'Issue Details': "I can help you understand this issue's details, status, and how to engage with the community discussion.",
    'All Issues': "I can help you find and filter issues, understand statuses, and navigate the issue list.",
    'User Profile': "I can help you manage your profile, understand your activity, and customize your settings.",
    'Login': "I can assist with login issues, password recovery, or account access problems.",
    'Registration': "I can guide you through the registration process and help you get started with CivicResolve.",
  };

  if (context.pageName.startsWith('Admin')) {
    return "I can help you navigate the admin dashboard, understand analytics, and manage the platform.";
  }

  return greetings[context.pageName] || "I'm here to help you with CivicResolve! Ask me anything about the platform.";
}
