import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function ConsoleLegacyEmailTemplateEditPage(props: Props) {
  const { id } = await props.params
  redirect(`/console/email-system/templates/${id}`)
}
