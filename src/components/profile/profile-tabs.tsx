'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProfileTabsProps {
  overview: React.ReactNode;
  publications: React.ReactNode;
  projects: React.ReactNode;
  experience: React.ReactNode;
  thesis: React.ReactNode;
  activities: React.ReactNode;
}

export function ProfileTabs(props: ProfileTabsProps) {
  const t = useTranslations('profile.tabs');

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
        <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
        <TabsTrigger value="publications">{t('publications')}</TabsTrigger>
        <TabsTrigger value="projects">{t('projects')}</TabsTrigger>
        <TabsTrigger value="experience">{t('experience')}</TabsTrigger>
        <TabsTrigger value="thesis">{t('thesis')}</TabsTrigger>
        <TabsTrigger value="activities">{t('activities')}</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-6">
        {props.overview}
      </TabsContent>
      <TabsContent value="publications" className="mt-6">
        {props.publications}
      </TabsContent>
      <TabsContent value="projects" className="mt-6">
        {props.projects}
      </TabsContent>
      <TabsContent value="experience" className="mt-6">
        {props.experience}
      </TabsContent>
      <TabsContent value="thesis" className="mt-6">
        {props.thesis}
      </TabsContent>
      <TabsContent value="activities" className="mt-6">
        {props.activities}
      </TabsContent>
    </Tabs>
  );
}
