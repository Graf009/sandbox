import * as X from "xstate";

type SubmitEvent = { type: "SUBMIT"; task: () => Promise<string> };
type FormEvent =
  | SubmitEvent
  | X.DoneInvokeEvent<string>
  | X.ErrorPlatformEvent
  | { type: "RESET" };

const delay = (ms = 2000) => new Promise(resolve => setTimeout(resolve, ms));

type Context = {
  error?: string;
  value?: string;
};

/**
 * Asserts that an event is of type [[DoneInvokeEvent]].
 *
 * @typeparam TData The type of the DoneInvokeEvent's `.data` payload.
 * @typeparam TEvent The set of event types given event can be of
 * @param event The event object that is sent by or to the state machine.
 */
export const isDoneInvokeEvent = <TData, TEvent extends { type: string }>(
  event: TEvent | X.DoneInvokeEvent<TData>
): event is X.DoneInvokeEvent<TData> => /^done.invoke/.test(event.type);

/**
 * Asserts that an event is of type [[ErrorPlatformEvent]]
 *
 * @typeparam TEvent The set of event types given event can be of
 * @param event The event object that is sent by or to the state machine.
 */
export const isErrorPlatformEvent = <TEvent extends { type: string }>(
  event: TEvent | X.ErrorPlatformEvent
): event is X.ErrorPlatformEvent => /^error.platform/.test(event.type);

export const isSubmitEvent = (event: X.AnyEventObject): event is SubmitEvent =>
  event.type === "SUBMIT";

export default (id: string) =>
  X.createMachine<Context, FormEvent>(
    {
      id,
      context: {
        error: undefined
      },
      on: {
        RESET: {
          target: "editing",
          actions: "assignReset"
        }
      },
      initial: "editing",
      states: {
        editing: {
          on: {
            SUBMIT: "submitting"
          }
        },
        submitting: {
          invoke: {
            id: "task",
            src: "task",
            onDone: {
              target: "done",
              actions: "assignValue"
            },
            onError: {
              target: "editing",
              actions: "assignError"
            }
          }
        },
        done: {}
      }
    },
    {
      services: {
        task: (_: Context, evt: X.AnyEventObject) =>
          isSubmitEvent(evt)
            ? delay().then(_ => evt.task())
            : Promise.reject("This should never happen.")
      },
      actions: {
        assignReset: X.assign<Context, FormEvent>({
          value: undefined,
          error: undefined
        }),
        assignError: X.assign<Context, FormEvent>({
          error: (_, e) =>
            isErrorPlatformEvent(e) ? e.data : "This should never happen",
          value: undefined
        }),
        assignValue: X.assign<Context, FormEvent>({
          value: (_, e) =>
            isDoneInvokeEvent(e) ? e.data : "This should never happen",
          error: undefined
        })
      }
    }
  );
