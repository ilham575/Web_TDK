CREATE TABLE IF NOT EXISTS characteristic_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active INT DEFAULT 1,
    FOREIGN KEY (school_id) REFERENCES schools(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS characteristic_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    topic_id INT NOT NULL,
    rating VARCHAR(50) NOT NULL,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES characteristic_topics(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
