import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
          spotify organizer
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Your HUD for the Spotify library
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Connect your Spotify account to organize playlists, see what you are
          listening to in real time, and get suggestions based on your collections.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("spotify", { redirectTo: "/dashboard" });
        }}
      >
        <Button type="submit" size="lg" className="gap-2">
          Sign in with Spotify
        </Button>
      </form>
    </div>
  );
}
