import type { ReactNode } from "react";
import { ThemeSelect } from "@/components/theme";
import { accountDeletionBlockers } from "@/lib/account";
import { DeleteAccountForm } from "./delete-account-form";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

type Props = { user: { id: string; name: string; email: string } };

// Personal settings: the same for customers (/account/settings) and staff (/admin/account).
export async function AccountSettings({ user }: Props) {
  const blockers = await accountDeletionBlockers(user.id);

  return (
    <div className="max-w-lg">
      <Section title="Profile" description={`Signed in as ${user.email}.`}>
        <ProfileForm name={user.name} />
      </Section>

      <Section
        title="Password"
        description="Changing your password logs you out on your other devices."
      >
        <PasswordForm />
      </Section>

      <Section
        title="Appearance"
        description={`Saved on this device. "System" follows your device's light or dark setting.`}
      >
        <label htmlFor="theme" className="block text-sm font-medium">
          Theme
        </label>
        <ThemeSelect />
      </Section>

      <Section title="Delete account" description="Permanently deletes your account.">
        {blockers.length > 0 ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : (
          <DeleteAccountForm />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-border pt-8 space-y-4 first:mt-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
