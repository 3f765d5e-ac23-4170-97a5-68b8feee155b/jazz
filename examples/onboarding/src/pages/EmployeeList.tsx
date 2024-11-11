import { ID } from "jazz-tools";
import { NavLink } from "../components/NavLink.tsx";
import { NavigateButton } from "../components/NavigateBack.tsx";
import { Stack } from "../components/Stack.tsx";
import { useCoState } from "../main.tsx";
import { CoEmployee, EmployeeCoList } from "../schema.ts";

export function EmployeeList({
  employeeListCoId,
}: {
  employeeListCoId: ID<EmployeeCoList>;
}) {
  const employees = useCoState(EmployeeCoList, employeeListCoId, [{}]);

  if (!employees) {
    return <div>Loading...</div>;
  }

  return (
    <Stack>
      <NavigateButton to="/employee/new" text={"Add New Employee"} />
      {employees.map((employee: CoEmployee) =>
        employee.deleted ? null : (
          <div
            key={employee.id}
            className="flex flex-row space-x-8 w-full max-w-md"
          >
            <span>{employee._owner.myRole()}</span>
            <span className="w-1/3">
              <NavLink to={`/employee/${employee.id}`}>{employee.name}</NavLink>
            </span>
            {employee.finalStep?.done && <span>✅</span>}
            {employee._owner.myRole() === "admin" &&
              !employee.finalStep?.done && (
                <span
                  onClick={() => {
                    employee.deleted = true;
                  }}
                  className="cursor-pointer"
                >
                  🗑
                </span>
              )}
          </div>
        ),
      )}
    </Stack>
  );
}
