'use client'

export default function DebugPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-10) : undefined,
    NEXT_PUBLIC_MICROSOFT_CLIENT_ID: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Environment Variables</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(envVars, null, 2)}
      </pre>
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Validation:</h2>
        <ul>
          <li>Supabase URL: {envVars.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}</li>
          <li>Supabase Key: {envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}</li>
          <li>Microsoft ID: {envVars.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ? '✅' : '❌'}</li>
        </ul>
      </div>
    </div>
  )
}