// 这个文件包含故意的错误，用于测试诊断功能

// 1. 类型错误
let numberVar: number = "这是字符串"; // 错误：不能将字符串赋值给数字类型

// 2. 未使用的变量
let unusedVariable = "我没有被使用";

// 3. 缺少返回类型
function noReturnType(x) { // 警告：缺少参数类型和返回类型
    return x * 2;
}

// 4. 可能为null的引用
let maybeNull: string | null = null;
console.log(maybeNull.length); // 错误：对象可能为null

// 5. 重复声明
let duplicateVar = 1;
let duplicateVar = 2; // 错误：重复声明

// 6. 缺少分号（如果启用了相关规则）
let missingSemicolon = "test"

// 7. 未定义的变量
console.log(undefinedVar); // 错误：未定义的变量

// 8. 错误的函数调用
function expectsNumber(n: number) {
    return n + 1;
}
expectsNumber("字符串"); // 错误：参数类型不匹配

export {};