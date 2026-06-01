import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { NewJobForm } from '@/components/new-job-form'

export default async function NewJobPage() {
  await requirePortal('client')
  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('id,name,slug').order('name')

  return (
    <div>
      <PageHeader title="Post a job" subtitle="Describe the work and start receiving applications." />
      <Card>
        <CardContent className="pt-6">
          <NewJobForm categories={categories ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
