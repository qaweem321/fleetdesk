"use client";

import {
  type ComponentProps,
  createContext,
  type FormEvent,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
} from "react";
import type { ActionState } from "@/lib/action-state";
import { FormMessage } from "./field";

type Action = (previous: ActionState, formData: FormData) => Promise<ActionState>;

const FormContext = createContext<{ pending: boolean; state: ActionState }>({
  pending: false,
  state: {},
});

// Lets SubmitButton and ActionMessage inside an ActionForm see its state.
export function useActionFormContext() {
  return useContext(FormContext);
}

type Props = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: Action;
  // Empty the fields after a successful save (forms that add things, like "Block dates").
  resetOnSuccess?: boolean;
};

// A form that sends its fields to a server action and shows the result.
// Unlike <form action={...}>, it keeps what the person typed when the server says something
// is wrong, so they only fix that field instead of filling everything in again.
// The fields can be rendered on the server and passed in as children.
export function ActionForm({ action, resetOnSuccess = false, children, ...props }: Props) {
  const [state, dispatch, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.success) {
      formRef.current?.reset();
    }
  }, [state, resetOnSuccess]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Include the button that was pressed (forms with "Accept" and "Ask to fix" buttons).
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  return (
    <FormContext.Provider value={{ pending, state }}>
      {/* action: a form sent before the page has finished loading still reaches the server
          action (not the URL). Once loaded, handleSubmit takes over. */}
      <form ref={formRef} action={dispatch} onSubmit={handleSubmit} {...props}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

// The error or success message of the surrounding ActionForm.
export function ActionMessage() {
  const { state } = useActionFormContext();
  return <FormMessage error={state.error} success={state.success} />;
}
