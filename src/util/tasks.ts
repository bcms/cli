export interface Task {
  title: string;
  task(): Promise<void>;
}

function toReadableTime(time: number): string {
  if (time < 1000) {
    return `${time}ms`;
  }
  let t = time / 1000;
  if (t < 60) {
    return `${t}s`;
  }
  t = t / 60;
  return `${t}min`;
}

export function createTasks(tasks: Task[]): {
  run(): Promise<void>;
} {
  return {
    async run() {
      const taskTimes: Array<{
        offs: number;
        time: number;
        prettyTime: string;
      }> = [];
      for (let i = 0; i < tasks.length; i = i + 1) {
        const timeOffs = Date.now();
        const task = tasks[i];
        console.log(`${i + 1}. ${task.title}`);
        try {
          await task.task();
          taskTimes.push({
            offs: timeOffs,
            time: Date.now() - timeOffs,
            prettyTime: toReadableTime(Date.now() - timeOffs),
          });
          console.log(`✓ ${i + 1}. ${task.title}`);
        } catch (error) {
          taskTimes.push({
            offs: timeOffs,
            time: Date.now() - timeOffs,
            prettyTime: toReadableTime(Date.now() - timeOffs),
          });
          for (let j = 0; j < tasks.length; j++) {
            const t = tasks[j];
            if (j === i) {
              break;
            } else {
              console.log(
                `✓ ${j + 1}. ${t.title} completed in ${
                  taskTimes[j].prettyTime
                }`,
              );
            }
          }
          console.log(
            `⨉ ${i + 1}. ${task.title} failed in ${taskTimes[i].prettyTime}`,
          );
          throw error;
        }
      }
      const output: string[] = [];
      let maxLength = 0;
      for (let j = 0; j < tasks.length; j++) {
        const t = tasks[j];
        const line = `| ✓ ${j + 1}. ${t.title} completed in ${
          taskTimes[j].prettyTime
        } `;
        if (line.length > maxLength) {
          maxLength = line.length;
        }
        output.push(line);
      }
      const border = '-'.repeat(maxLength + 1);
      console.log(
        `\n\nRESULTS\n${border}\n${output
          .map((s) => {
            const d = maxLength - s.length;
            if (d > 1) {
              s += ' '.repeat(d);
            }
            s += '|';
            return s;
          })
          .join('\n')}\n${border}`,
      );
    },
  };
}
