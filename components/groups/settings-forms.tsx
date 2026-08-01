"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  deleteGroup,
  inviteMember,
  leaveGroup,
  renameGroup,
} from "@/lib/actions/groups";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BottomSheet } from "@/components/ui/bottom-sheet";

type Feedback = { kind: "success" | "error"; message: string } | null;

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      role="status"
      className={
        feedback.kind === "success"
          ? "text-sm text-brand-600 dark:text-brand-400"
          : "text-sm text-red-600 dark:text-red-400"
      }
    >
      {feedback.message}
    </p>
  );
}

export function RenameForm({
  groupId,
  defaultName,
}: {
  groupId: string;
  defaultName: string;
}) {
  const router = useRouter();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(defaultName);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await renameGroup({ groupId, name });
      setFeedback(
        result.ok
          ? { kind: "success", message: t("renamed") }
          : { kind: "error", message: result.error },
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label
        htmlFor="group-name"
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {t("groupName")}
      </label>
      <Input
        id="group-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="off"
      />
      <FeedbackMessage feedback={feedback} />
      <Button
        type="submit"
        variant="secondary"
        disabled={isPending || name.trim() === defaultName}
      >
        {isPending ? <Spinner /> : null}
        {isPending ? tCommon("saving") : t("rename")}
      </Button>
    </form>
  );
}

export function InviteForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const t = useTranslations("settings");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await inviteMember({ groupId, email });
      if (result.ok) {
        setEmail("");
        setFeedback({ kind: "success", message: t("inviteSuccess") });
        router.refresh();
      } else {
        setFeedback({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label
        htmlFor="invite-email"
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {t("inviteByEmail")}
      </label>
      <div className="flex gap-2">
        <Input
          id="invite-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder={t("invitePlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          type="submit"
          size="lg"
          disabled={isPending || email.trim() === ""}
          className="shrink-0"
        >
          {isPending ? <Spinner /> : t("invite")}
        </Button>
      </div>
      <FeedbackMessage feedback={feedback} />
    </form>
  );
}

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirmLeave() {
    setFeedback(null);
    startTransition(async () => {
      const result = await leaveGroup(groupId);
      if (result.ok) {
        router.push("/home");
      } else {
        setConfirmOpen(false);
        setFeedback({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <div className="shrink-0 space-y-1 text-end">
      <Button
        variant="outline"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
      >
        {isPending ? <Spinner /> : null}
        {isPending ? t("leaving") : t("leaveGroup")}
      </Button>
      <FeedbackMessage feedback={feedback} />

      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("leaveGroup")}
      >
        <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
          {t("leaveConfirm")}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setConfirmOpen(false)}
            disabled={isPending}
            className="flex-1"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            size="lg"
            onClick={onConfirmLeave}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? <Spinner /> : null}
            {tCommon("confirm")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

export function DeleteGroupButton({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const router = useRouter();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function onConfirmDelete() {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteGroup(groupId);
      if (result.ok) {
        router.push("/home");
      } else {
        setConfirmOpen(false);
        setFeedback({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <div className="shrink-0 space-y-1 text-end">
      <Button
        variant="danger"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
      >
        {isPending ? <Spinner /> : null}
        {isPending ? t("deleting") : t("deleteGroup")}
      </Button>
      <FeedbackMessage feedback={feedback} />

      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("deleteGroup")}
      >
        <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
          {t("deleteConfirm", { name: groupName })}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setConfirmOpen(false)}
            disabled={isPending}
            className="flex-1"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={onConfirmDelete}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? <Spinner /> : null}
            {tCommon("confirm")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
