"""
vector_index.py - 轻量本地向量索引（TF-IDF 字符 n-gram）

所属模块：ai-engine/app/services
功能简述：
    把知识文档转成稀疏向量并做余弦相似度检索，作为关键词检索的语义兜底。
    不依赖外部 embedding 服务；scikit-learn 不可用时自动降级为不可用。
依赖关系：
    - sklearn：TfidfVectorizer / cosine_similarity
"""
import os
from typing import Dict, List, Tuple


class VectorIndex:
    """内存向量索引：字符 n-gram TF-IDF + 余弦相似度。"""

    def __init__(self):
        self.available = False
        self._ids: List[str] = []
        self._texts: List[str] = []
        self._docs: Dict[str, object] = {}
        self._vectorizer = None
        self._matrix = None
        self._dirty = False
        try:
            # 仅检查依赖可用性，真正的向量化延迟到首次检索时执行
            from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: F401
            self.available = True
        except Exception as e:
            print(f"[VectorIndex] scikit-learn 不可用，向量检索关闭: {e}")

        try:
            self.min_score = float(os.getenv("RAG_MIN_VECTOR_SCORE", "0.15"))
        except ValueError:
            self.min_score = 0.15

    def add(self, doc_id: str, text: str, doc: object = None) -> None:
        """登记一篇文档；重复 ID 会被忽略，文本截断以控制内存占用。"""
        if not self.available or not text or not text.strip():
            return
        if doc_id in self._docs:
            return
        self._ids.append(doc_id)
        self._texts.append(text[:4000])
        self._docs[doc_id] = doc
        self._dirty = True

    def _fit(self) -> None:
        """语料变化后重建 TF-IDF 矩阵（文档量很小，重建成本可忽略）。"""
        if not self._dirty or not self._texts:
            return
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            vectorizer = TfidfVectorizer(
                analyzer="char",          # 中文无空格，字符 n-gram 更稳
                ngram_range=(2, 3),
                min_df=1,
                max_features=20000,
                sublinear_tf=True,
            )
            matrix = vectorizer.fit_transform(self._texts)
            self._vectorizer = vectorizer
            self._matrix = matrix
            self._dirty = False
            print(f"[VectorIndex] 已构建向量索引，文档数: {len(self._ids)}")
        except Exception as e:
            print(f"[VectorIndex] 构建向量索引失败，关闭向量检索: {e}")
            self.available = False

    def search(self, query: str, top_k: int = 3) -> List[Tuple[str, float]]:
        """返回 [(doc_id, 余弦相似度)]，仅保留达到阈值的结果。"""
        if not self.available or not query or not query.strip():
            return []
        self._fit()
        if self._vectorizer is None or self._matrix is None:
            return []
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            q = self._vectorizer.transform([query])
            sims = cosine_similarity(q, self._matrix)[0]
            order = sims.argsort()[::-1][: max(1, top_k)]
            return [(self._ids[i], float(sims[i])) for i in order if sims[i] >= self.min_score]
        except Exception as e:
            print(f"[VectorIndex] 向量检索失败: {e}")
            return []

    def get_doc(self, doc_id: str):
        """按 ID 取回登记的原始文档字典。"""
        return self._docs.get(doc_id)
