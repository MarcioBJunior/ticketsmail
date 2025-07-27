export default function CallbackLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simple layout without any Supabase client initialization
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}