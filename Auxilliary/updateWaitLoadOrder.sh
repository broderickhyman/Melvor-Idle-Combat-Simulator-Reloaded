# insert waitLoadOrder in all injected files
for f in ../Extension/sources/injectable/*.ts; do
    start=`grep -n  "    let loadCounter = 0;" "${f}" | cut -f1 -d: | head -n1`
    end=`grep -n  "    waitLoadOrder(reqs, setup" "${f}" | cut -f1 -d: | tail -n1`
    [[ ! -z "${start}" ]] && echo "inserting waitLoadOrder in ${f}" && head -n ${start} "${f}" > tmp && cat waitLoadOrder.ts >> tmp && tail -n +${end} "${f}" >> tmp && mv tmp "${f}"
done;
