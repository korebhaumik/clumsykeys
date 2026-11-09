export const pythonArr = [
  `import math\ndef calculate_area(radius):\n\tif radius < 0:\n\t\treturn "Invalid radius"\n\telse:\n\t\treturn math.pi * math.pow(radius, 2)\nprint(calculate_area(5))`.split(
    "\n"
  ),
  `def bubble_sort(numbers):\n\tfor i in range(len(numbers)):\n\t\tfor j in range(len(numbers) - 1):\n\t\t\tif numbers[j] > numbers[j + 1]:\n\t\t\t\tnumbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]\n\treturn numbers\nprint(bubble_sort([5, 3, 8, 1, 2]))`.split(
    "\n"
  ),
  `def find_longest_word(sentence):\n\twords = sentence.split()\n\tlongest_word = max(words, key=len)\n\treturn longest_word\nprint(find_longest_word("The quick brown fox jumps over the lazy dog"))`.split(
    "\n"
  ),
  `def calculate_sum(numbers):\n\tsum = 0\n\tfor number in numbers:\n\t\tsum += number\n\treturn sum\nprint(calculate_sum([1, 2, 3, 4, 5]))`.split(
    "\n"
  ),
  `def reverse_string(string):\n\treturn string[::-1]\nprint(reverse_string("Hello, World!"))`.split(
    "\n"
  ),
];

export const javascriptArr = [
  `function calculateArea(radius) {\n\tif (radius < 0) {\n\t\treturn "Invalid radius";\n\t} else {\n\t\treturn Math.PI * Math.pow(radius, 2);\n\t}\n}\nconsole.log(calculateArea(5));`.split(
    "\n"
  ),
  `function bubbleSort(numbers) {\n\tfor (let i = 0; i < numbers.length; i++) {\n\t\tfor (let j = 0; j < numbers.length - 1; j++) {\n\t\t\tif (numbers[j] > numbers[j + 1]) {\n\t\t\t\t[numbers[j], numbers[j + 1]] = [numbers[j + 1], numbers[j]];\n\t\t\t}\n\t\t}\n\t}\n\treturn numbers;\n}\nconsole.log(bubbleSort([5, 3, 8, 1, 2]));`.split(
    "\n"
  ),
  `function findLongestWord(sentence) {\n\tconst words = sentence.split(' ');\n\tconst longestWord = words.reduce((longest, currentWord) => currentWord.length > longest.length ? currentWord : longest, '');\n\treturn longestWord;\n}\nconsole.log(findLongestWord("The quick brown fox jumps over the lazy dog"));`.split(
    "\n"
  ),
  `function calculateSum(numbers) {\n\tlet sum = 0;\n\tfor (let number of numbers) {\n\t\tsum += number;\n\t}\n\treturn sum;\n}\nconsole.log(calculateSum([1, 2, 3, 4, 5]));`.split(
    "\n"
  ),
  `function reverseString(string) {\n\treturn string.split('').reverse().join('');\n}\nconsole.log(reverseString("Hello, World!"));`.split(
    "\n"
  ),
];

export const javaArr = [
  `public class Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println(calculateArea(5));\n\t}\n\tpublic static double calculateArea(double radius) {\n\t\tif (radius < 0) {\n\t\t\treturn -1;\n\t\t} else {\n\t\t\treturn Math.PI * Math.pow(radius, 2);\n\t\t}\n\t}\n}`.split(
    "\n"
  ),
  `public class Main {\n\tpublic static void main(String[] args) {\n\t\tint[] numbers = {5, 3, 8, 1, 2};\n\t\tbubbleSort(numbers);\n\t\tfor (int number : numbers) {\n\t\t\tSystem.out.print(number + " ");\n\t\t}\n\t}\n\tpublic static void bubbleSort(int[] numbers) {\n\t\tfor (int i = 0; i < numbers.length; i++) {\n\t\t\tfor (int j = 0; j < numbers.length - 1; j++) {\n\t\t\t\tif (numbers[j] > numbers[j + 1]) {\n\t\t\t\t\tint temp = numbers[j];\n\t\t\t\t\tnumbers[j] = numbers[j + 1];\n\t\t\t\t\tnumbers[j + 1] = temp;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}`.split(
    "\n"
  ),
  `public class Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println(findLongestWord("The quick brown fox jumps over the lazy dog"));\n\t}\n\tpublic static String findLongestWord(String sentence) {\n\t\tString[] words = sentence.split(" ");\n\t\tString longestWord = "";\n\t\tfor (String word : words) {\n\t\t\tif (word.length() > longestWord.length()) {\n\t\t\t\tlongestWord = word;\n\t\t\t}\n\t\t}\n\t\treturn longestWord;\n\t}\n}`.split(
    "\n"
  ),
  `public class Main {\n\tpublic static void main(String[] args) {\n\t\tint[] numbers = {1, 2, 3, 4, 5};\n\t\tSystem.out.println(calculateSum(numbers));\n\t}\n\tpublic static int calculateSum(int[] numbers) {\n\t\tint sum = 0;\n\t\tfor (int number : numbers) {\n\t\t\tsum += number;\n\t\t}\n\t\treturn sum;\n\t}\n}`.split(
    "\n"
  ),
  `public class Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println(reverseString("Hello, World!"));\n\t}\n\tpublic static String reverseString(String string) {\n\t\treturn new StringBuilder(string).reverse().toString();\n\t}\n}`.split(
    "\n"
  ),
];

export const cppArr = [
  `#include <iostream>\n#include <cmath>\nint main() {\n\tdouble radius = 5;\n\tif (radius < 0) {\n\t\tstd::cout << "Invalid radius" << std::endl;\n\t} else {\n\t\tstd::cout << "Area: " << M_PI * std::pow(radius, 2) << std::endl;\n\t}\n\treturn 0;\n}`.split(
    "\n"
  ),
  `#include <iostream>\n#include <vector>\n#include <algorithm>\nint main() {\n\tstd::vector<int> numbers = {5, 3, 8, 1, 2};\n\tstd::sort(numbers.begin(), numbers.end());\n\tfor (int number : numbers) {\n\t\tstd::cout << number << " ";\n\t}\n\tstd::cout << std::endl;\n\treturn 0;\n}`.split(
    "\n"
  ),
  `#include <iostream>\n#include <string>\n#include <sstream>\nint main() {\n\tstd::string sentence = "The quick brown fox jumps over the lazy dog";\n\tstd::istringstream iss(sentence);\n\tstd::string longestWord, word;\n\twhile (iss >> word) {\n\t\tif (word.size() > longestWord.size()) {\n\t\t\tlongestWord = word;\n\t\t}\n\t}\n\tstd::cout << "Longest word: " << longestWord << std::endl;\n\treturn 0;\n}`.split(
    "\n"
  ),
  `#include <iostream>\n#include <vector>\nint main() {\n\tstd::vector<int> numbers = {1, 2, 3, 4, 5};\n\tint sum = 0;\n\tfor (int number : numbers) {\n\t\tsum += number;\n\t}\n\tstd::cout << "Sum: " << sum << std::endl;\n\treturn 0;\n}`.split(
    "\n"
  ),
  `#include <iostream>\n#include <string>\n#include <algorithm>\nint main() {\n\tstd::string str = "Hello, World!";\n\tstd::reverse(str.begin(), str.end());\n\tstd::cout << "Reversed string: " << str << std::endl;\n\treturn 0;\n}`.split(
    "\n"
  ),
];

export const cArr = [
  `#include <stdio.h>\nint main() {\n\tchar str[] = "Hello, World!";\n\tint n = strlen(str);\n\tfor (int i = 0; i < n / 2; i++) {\n\t\tchar temp = str[i];\n\t\tstr[i] = str[n - i - 1];\n\t\tstr[n - i - 1] = temp;\n\t}\n\tprintf("Reversed string: %s\\n", str);\n\treturn 0;\n}`.split(
    "\n"
  ),
  `#include <stdio.h>\nint main() {\n\tint numbers[] = {1, 2, 3, 4, 5};\n\tint sum = 0;\n\tfor (int i = 0; i < sizeof(numbers) / sizeof(numbers[0]); i++) {\n\t\tsum += numbers[i];\n\t}\n\tprintf("Sum: %d\\n", sum);\n\treturn 0;\n}`.split(
    "\n"
  ),
  `#include <stdio.h>\nint main() {\n\tint radius = 5;\n\tif (radius < 0) {\n\t\tprintf("Invalid radius\\n");\n\t} else {\n\t\tprintf("Area: %f\\n", 3.14 * radius * radius);\n\t}\n\treturn 0;\n}`.split(
    "\n"
  ),
  `#include <stdio.h>\n#include <string.h>\nint main() {\n\tchar sentence[] = "The quick brown fox jumps over the lazy dog";\n\tchar *word = strtok(sentence, " ");\n\tchar *longestWord = word;\n\twhile (word != NULL) {\n\t\tif (strlen(word) > strlen(longestWord)) {\n\t\t\tlongestWord = word;\n\t\t}\n\t\tword = strtok(NULL, " ");\n\t}\n\tprintf("Longest word: %s\\n", longestWord);\n\treturn 0;\n}`.split(
    "\n"
  ),
  `#include <stdio.h>\nint main() {\n\tint numbers[] = {5, 3, 8, 1, 2};\n\tint n = sizeof(numbers) / sizeof(numbers[0]);\n\tfor (int i = 0; i < n - 1; i++) {\n\t\tfor (int j = 0; j < n - i - 1; j++) {\n\t\t\tif (numbers[j] > numbers[j + 1]) {\n\t\t\t\tint temp = numbers[j];\n\t\t\t\tnumbers[j] = numbers[j + 1];\n\t\t\t\tnumbers[j + 1] = temp;\n\t\t\t}\n\t\t}\n\t}\n\tfor (int i = 0; i < n; i++) {\n\t\tprintf("%d ", numbers[i]);\n\t}\n\tprintf("\\n");\n\treturn 0;\n}`.split(
    "\n"
  ),
];

export const tsArr = [
  `function reverseString(str: string): string {\n\treturn str.split('').reverse().join('');\n}\nconsole.log(reverseString("Hello, World!"));`.split(
    "\n"
  ),
  `function calculateSum(numbers: number[]): number {\n\tlet sum = 0;\n\tfor (let number of numbers) {\n\t\tsum += number;\n\t}\n\treturn sum;\n}\nconsole.log(calculateSum([1, 2, 3, 4, 5]));`.split(
    "\n"
  ),
  `function calculateArea(radius: number): string | number {\n\tif (radius < 0) {\n\t\treturn "Invalid radius";\n\t} else {\n\t\treturn Math.PI * Math.pow(radius, 2);\n\t}\n}\nconsole.log(calculateArea(5));`.split(
    "\n"
  ),
  `function findLongestWord(sentence: string): string {\n\tconst words = sentence.split(' ');\n\tconst longestWord = words.reduce((longest, currentWord) => currentWord.length > longest.length ? currentWord : longest, '');\n\treturn longestWord;\n}\nconsole.log(findLongestWord("The quick brown fox jumps over the lazy dog"));`.split(
    "\n"
  ),
  `function bubbleSort(numbers: number[]): number[] {\n\tfor (let i = 0; i < numbers.length; i++) {\n\t\tfor (let j = 0; j < numbers.length - 1; j++) {\n\t\t\tif (numbers[j] > numbers[j + 1]) {\n\t\t\t\tlet temp = numbers[j];\n\t\t\t\tnumbers[j] = numbers[j + 1];\n\t\t\t\tnumbers[j + 1] = temp;\n\t\t\t}\n\t\t}\n\t}\n\treturn numbers;\n}\nconsole.log(bubbleSort([5, 3, 8, 1, 2]));`.split(
    "\n"
  ),
];
