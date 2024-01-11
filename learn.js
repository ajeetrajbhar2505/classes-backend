
const unsortedArray = [64, 34, 25, 12, 22, 11, 11, 90];
const arrayOfObjects = [{ name: 'ajeet', age: 21 }, { name: 'ajeet', age: 21 }, { name: 'praddep', age: 22 }];


function bubblesort(array) {
    const n = array.length
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (array[j] > array[j + 1]) {
                const temp = array[j]
                array[j] = array[j + 1]
                array[j + 1] = temp
            }
        }
    }

    return array
}


function removeDuplicates(array) {
    const uniqueArray = []
    for (let i = 0; i < array.length; i++) {
        if (uniqueArray.indexOf(array[i]) == -1) {
            uniqueArray.push(array[i])
        }
    }
    return uniqueArray
}

function removearrayOfObjectsDuplicates(array, property) {
    const uniqueArray = []
    const set = new Set()
    for (let i = 0; i < array.length; i++) {
        const value = array[i][property]
        if (!set.has(value)) {
            set.add(value)
            uniqueArray.push(array[i])
        }
    }
    return uniqueArray
}

const filter1 = unsortedArray.filter((object, index, self) => self.indexOf(object) === index)
const filter2 = arrayOfObjects.filter((object, index, self) => self.findIndex((o) => o.name == object.name) === index)
console.log(filter2);









