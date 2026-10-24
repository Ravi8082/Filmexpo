import { FilmExpoHome } from '@/components/film-expo-home'
import { EventStructuredData, OrganizationStructuredData } from '@/components/structured-data'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

export default async function Page() {
  const { content, hiddenSections } = await getHomepageContent()
  return (
    <>
      <FilmExpoHome content={content} hiddenSections={hiddenSections} />
      <OrganizationStructuredData
        name={content.brand.name}
        logo={content.brand.logo}
        description={content.footer.description}
        socials={content.footer.socialLinks.map((link) => ({ name: link.label, url: link.href }))}
      />
      <EventStructuredData events={content.event.items} organizerName={content.brand.name} />
    </>
  )
}
