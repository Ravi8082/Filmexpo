import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmExpoBlog } from '@/components/film-expo-blog'
import { BlogPostingStructuredData } from '@/components/structured-data'
import { getHomepageContent } from '@/lib/site-content'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { content } = await getHomepageContent()
  const post = content.blogPage.posts.find((item) => item.slug === decodeURIComponent(slug))
  return post
    ? { title: `${post.title} | Film Expo India`, description: post.excerpt }
    : { title: 'Blog | Film Expo India' }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const { content, hiddenSections } = await getHomepageContent()
  const decoded = decodeURIComponent(slug)
  const post = content.blogPage.posts.find((item) => item.slug === decoded)
  if (hiddenSections.includes('blogPage') || !post) notFound()
  return (
    <>
      <FilmExpoBlog content={content} hiddenSections={hiddenSections} slug={decoded} />
      <BlogPostingStructuredData post={post} />
    </>
  )
}
