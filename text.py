class Solution(object):
    
    def __init__(self):
        self.numtostr = [
            2 : "abc"
            3 : "def"
            4 : "ghi"
            5 : "jkl"
            6 : "mno"
            7 : "pqrs"
            8 : "tuv"
            9 : "wxyz"
        ]
    
    def letterCombinations(self, digits):
        
        if not digits and  digits.find("1"):
            return []
        
        data = []
        
        for ch in len(digits):
            ch == 
        