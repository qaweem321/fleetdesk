import assert from "node:assert/strict";
import { test } from "node:test";
import { addMonths, nextTaskDue, parseTaskInput, taskUrgency } from "./rules";

const today = "2026-10-10";

test("a task is overdue, due soon or later, by date or mileage, whichever comes first", () => {
  assert.equal(taskUrgency({ dueOn: "2026-10-09", dueMileage: null }, 0, today), "overdue");
  assert.equal(taskUrgency({ dueOn: "2026-10-20", dueMileage: null }, 0, today), "due_soon");
  assert.equal(taskUrgency({ dueOn: "2026-12-01", dueMileage: null }, 0, today), "later");
  assert.equal(taskUrgency({ dueOn: null, dueMileage: 20000 }, 20000, today), "overdue");
  assert.equal(taskUrgency({ dueOn: null, dueMileage: 20000 }, 19600, today), "due_soon");
  assert.equal(taskUrgency({ dueOn: "2027-01-01", dueMileage: 20000 }, 19600, today), "due_soon");
  assert.equal(taskUrgency({ dueOn: "2027-01-01", dueMileage: 30000 }, 19600, today), "later");
});

test("adding months keeps the day, or uses the month's last day", () => {
  assert.equal(addMonths("2026-10-10", 6), "2027-04-10");
  assert.equal(addMonths("2026-08-31", 6), "2027-02-28");
  assert.equal(addMonths("2027-12-15", 1), "2028-01-15");
});

test("the next task is counted from when the work was really done", () => {
  assert.deepEqual(nextTaskDue({ repeatMonths: 12, repeatDistance: 10000 }, "2026-10-10", 41250), {
    dueOn: "2027-10-10",
    dueMileage: 51250,
  });
  assert.deepEqual(nextTaskDue({ repeatMonths: null, repeatDistance: 5000 }, "2026-10-10", 41250), {
    dueOn: null,
    dueMileage: 46250,
  });
  assert.equal(nextTaskDue({ repeatMonths: null, repeatDistance: null }, "2026-10-10", 1), null);
});

const reader = (values: Record<string, string>) => (name: string) => (values[name] ?? "").trim();

test("reads a maintenance task", () => {
  assert.deepEqual(
    parseTaskInput(reader({ title: "Oil change", dueMileage: "50000", repeatDistance: "10000" })),
    {
      values: {
        title: "Oil change",
        dueOn: null,
        dueMileage: 50000,
        repeatMonths: null,
        repeatDistance: 10000,
        notes: null,
      },
    },
  );
});

test("a task needs a name and a due date or mileage", () => {
  const noDue = parseTaskInput(reader({ title: "Tires" }));
  assert.ok("error" in noDue);
  assert.match(noDue.error, /a date, a mileage, or both/);
  assert.ok("error" in parseTaskInput(reader({ dueOn: "2026-12-01" })));
  assert.ok("error" in parseTaskInput(reader({ title: "Tires", dueOn: "2026-02-30" })));
  assert.ok("error" in parseTaskInput(reader({ title: "Tires", dueMileage: "lots" })));
});
