import { timer, race, merge as rxMerge } from 'rxjs';
import {
  buffer,
  bufferCount,
  bufferTime,
  bufferToggle,
  bufferWhen,
  concatMap,
  concatMapTo,
  groupBy,
  take,
  ignoreElements,
  endWith,
  map,
  mapTo,
  mergeMap,
  mergeMapTo,
  pairwise,
  pluck,
  repeat,
  scan,
  switchMap,
  switchMapTo,
} from 'rxjs/operators';
import { evolve, merge } from 'ramda';

/* t = time, c = content */
export const transformationExamples = {
  buffer: {
    label: 'buffer',
    inputs: [
      [{t:9, c:'A'}, {t:23, c:'B'}, {t:40, c:'C'}, {t:54, c:'D'}, {t:71, c:'E'}, {t:85, c:'F'}],
      [{t:33, c:0}, {t:50, c:0}, {t:90, c:0}],
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        buffer(inputs[1]),
        map(x => `[${x}]`)
      );
    }
  },

  bufferCount: {
    label: 'bufferCount(3, 2)',
    inputs: [
      [{t:9, c:'A'}, {t:23, c:'B'}, {t:40, c:'C'}, {t:54, c:'D'}, {t:71, c:'E'}, {t:85, c:'F'}],
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        bufferCount(3, 2),
        map(x => `[${x}]`)
      );
    }
  },

  bufferTime: {
    label: 'bufferTime(30)',
    inputs: [
      [{t:0, c:'A'}, {t:10, c:'B'}, {t:22, c:'C'}, {t:51, c:'D'}, {t:71, c:'E'}, {t:95, c:'F'}],
    ],
    apply(inputs, scheduler) {
      return inputs[0].pipe(
        pluck('content'),
        bufferTime(30, scheduler),
        map(x => `[${x}]`)
      );
    }
  },

  bufferTimeOrCount: {
    label: 'bufferTimeOrCount(30, 3)',
    inputs: [
      [{t:2, c:'A1'}, {t:4, c:'A2'}, {t:7, c:'A3'}, {t:31, c:'B1'}, {t:32, c:'B2'}, {t:40, c:'B3'}, {t:71, c:'C1'}, {t:72, c:'C2'}, {t:73, c:'C3'}],
    ],
    apply(inputs, scheduler) {
      return inputs[0].pipe(
        pluck('content'),
        bufferTime(30, null, 3, scheduler),
        map(x => `[${x}]`)
      );
    },
  },

  bufferToggle: {
    label: 'bufferToggle(start$, x => timer(x))',
    inputs: [
      [{t:0, c:1}, {t:10, c:2}, {t:20, c:3}, {t:30, c:4}, {t:40, c:5}, {t:50, c:6}, {t:60, c:7}, {t:70, c:8}, {t:80, c:9}],
      [{t:15, c:10}, {t:45, c:30}],
    ],
    apply(inputs, scheduler) {
      return inputs[0].pipe(
        pluck('content'),
        bufferToggle(inputs[1], (x) => timer(x.content, scheduler)),
        map(x => `[${x}]`)
      );
    }
  },

  bufferWhen: {
    label: 'bufferWhen',
    inputs: [
      [{t:0, c:1}, {t:10, c:2}, {t:20, c:3}, {t:30, c:4}, {t:40, c:5}, {t:50, c:6}, {t:60, c:7}, {t:70, c:8}, {t:80, c:9}],
      [{t:35, c:0}, {t:50, c:0}],
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        bufferWhen(() => inputs[1]),
        map(x => `[${x}]`)
      )
    }
  },

  bufferGroupByCount: {
    label: 'bufferGroupByCount(x=>x[0], 20, 3)',
    inputs: [
      [{t:0, c:'A1'}, {t:36, c:'B1'}, {t:50, c:'C1'},
       {t:4, c:'A2'}, {t:40, c:'B2'}, {t:58, c:'C2'},
       {t:8, c:'A3'}, {t:54, c:'B3'}, {t:68, c:'C3'}],
       //[{t:20, c:'0'}, {t:40, c:'0'}, {t:60, c:'0'}]
    ],
    apply(inputs, scheduler) {
      const TIMEOUT = 20;
      const MAX_COUNT = 3;

      return inputs[0].pipe(
        pluck('content'),
        groupBy(x => x[0]),
        mergeMap(group$ =>
          group$.pipe(
            bufferToggle(
              group$.pipe(take(1)),
              () => group$.pipe(
                take(MAX_COUNT - 1),
                ignoreElements(),
                endWith(null)
              )
            ),
          )
        ),
        map(x => `[${x}]`),
        // buffer(inputs[1]),
        // map(x => `[${x}]`)
      );
    }
  },

  bufferGroupByTimeOrCount: {
    label: 'bufferGroupByTimeOrCount(x=>x[0], 20, 3)',
    inputs: [
      [{t:0, c:'A1'}, {t:36, c:'B1'}, {t:50, c:'C1'},
       {t:4, c:'A2'}, {t:40, c:'B2'}, {t:58, c:'C2'},
       {t:8, c:'A3'}, {t:54, c:'B3'}, {t:68, c:'C3'}],
       //[{t:20, c:'0'}, {t:40, c:'0'}, {t:60, c:'0'}]
    ],
    apply(inputs, scheduler) {
      const TIMEOUT = 20;
      const MAX_COUNT = 3;

      return inputs[0].pipe(
        pluck('content'),
        groupBy(x => x[0]),
        mergeMap(group$ =>
          group$.pipe(
            bufferToggle(
              // open buffer on first item
              group$.pipe(take(1)),
              () => race(
                group$.pipe(
                  take(MAX_COUNT - 1),
                  ignoreElements(),
                  endWith(null)
                ),
                timer(TIMEOUT, scheduler)
              )
            ),
          )
        ),
        map(x => `[${x}]`),
        // buffer(inputs[1]),
        // map(x => `[${x}]`)
      );
    }
  },

  concatMap: {
    label: 'obs1$.concatMap(x => obs2$.pipe(map(y => "" + x + y))',
    inputs: [
      [{t:0, c:'A'}, {t:42, c:'B'}, {t:55, c:'C'}],
      [{t:0, c:1}, {t:10, c:2}, {t:20, c:3}, 25]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        concatMap(x => inputs[1].pipe(pluck('content'), map(y => String(x + y))))
      )
    }
  },

  concatMapTo: {
    label: 'obs1$.concatMapTo(obs2$)',
    inputs: [
      [{t:0, c:'A'}, {t:42, c:'B'}, {t:55, c:'C'}],
      [{t:0, c:1}, {t:10, c:2}, {t:20, c:3}, 25]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        concatMapTo(inputs[1].pipe(pluck('content')))
      )
    }
  },

  groupBy: {
    label: 'groupBy',
    inputs: [
      [{t:0, c:'1'}, {t:10, c:'1'}, {t:20, c:'3'}, {t:30, c:'1'}, {t:50, c:'2'}, {t:60, c:'3'}],
    ],
    apply(inputs, scheduler) {
      return inputs[0].pipe(
        pluck('content'),
        groupBy(x => x),
        map(x => `${x.key}:[${x.refCountSubscription.groups.size}]`),
      );
    }
  },

  map: {
    label: 'map(x => 10 * x)',
    inputs: [
      [{t:10, c:1}, {t:20, c:2}, {t:50, c:3}]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        map(evolve({ content: (c) => c * 10 }))
      );
    }
  },

  mapTo: {
    label: 'mapTo("a")',
    inputs: [
      [{t:10, c:1}, {t:20, c:2}, {t:50, c:3}]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        mapTo('a')
      );
    }
  },

  mergeMap: {
    label: 'obs1$.mergeMap(x => obs2$.pipe(map(y => "" + x + y), 2)',
    inputs: [
      [{t:0, c:'A'}, {t:3, c:'B'}, {t:6, c:'C'}],
      [{t:0, c:1}, {t:12, c:2}, {t:24, c:3}, 28]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        mergeMap(x => inputs[1].pipe(pluck('content'), map(y => "" + x + y)), 2)
      )
    }
  },

  mergeMapTo: {
    label: 'obs1$.mergeMapTo(obs2$)',
    inputs: [
      [{t:0, c:'A'}, {t:3, c:'B'}, {t:40, c:'C'}],
      [{t:0, c:1}, {t:12, c:2}, {t:24, c:3}, 25]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        mergeMapTo(inputs[1].pipe(pluck('content')), 2)
      )
    }
  },

  pairwise: {
    label: 'pairwise',
    inputs: [
      [{t:9, c:'A'}, {t:23, c:'B'}, {t:40, c:'C'}, {t:54, c:'D'}, {t:71, c:'E'}, {t:85, c:'F'}],
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        pairwise(),
        map(x => `[${x}]`)
      )
    }
  },

  pluck: {
    label: 'pluck("a")',
    inputs: [
      [{t:10, c:'{a:1}'}, {t:20, c:'{a:2}'}, {t:50, c:'{a:5}'}]
    ],
    apply(inputs) {
      // simulated implementation
      return inputs[0].pipe(map(evolve({ content: c => c.match(/\d/)[0] })));
    }
  },

  repeat: {
    label: 'repeat(3)',
    inputs: [
      [{t:0, c:'A'}, {t:12, c: 'B'}, 26],
    ],
    apply(inputs) {
      return inputs[0].pipe(repeat(3));
    }
  },

  scan: {
    label: 'scan((x, y) => x + y)',
    inputs: [
      [{t:5, c:1}, {t:15, c:2}, {t:25, c:3}, {t:35, c:4}, {t:65, c:5}]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        scan((x, y) => merge(x, { content: x.content + y.content, id: x.id + y.id }))
      );
    }
  },

  switchMap: {
    label: 'obs1$.switchMap(x => obs2$.pipe(map(y => "" + x + y)))',
    inputs: [
      [{t:0, c:'A'}, {t:42, c:'B'}, {t:55, c:'C'}],
      [{t:0, c:1}, {t:10, c:2}, {t:20, c:3}, 25]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        switchMap(x => inputs[1].pipe(pluck('content'), map(y => '' + x + y)))
      )
    }
  },

  switchMapTo: {
    label: 'obs1$.switchMapTo(obs2$)',
    inputs: [
      [{t:0, c:'A'}, {t:42, c:'B'}, {t:55, c:'C'}],
      [{t:0, c:1}, {t:10, c:2}, {t:20, c:3}, 25]
    ],
    apply(inputs) {
      return inputs[0].pipe(
        pluck('content'),
        switchMapTo(inputs[1].pipe(pluck('content')))
      )
    }
  },
};
