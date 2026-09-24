import MainLayout from "@/components/layout/MainLayout";
import styles from "@/styles/pages/site.module.css";

function AboutPage() {
  return (
    <section className={styles.hero}>
      <h1>About</h1>
      <p>
        `pages/site` 디렉터리에 CSS 중심 페이지를 추가하면 됩니다. 각 페이지에서{" "}
        <code className={styles.mono}>getLayout</code>으로{" "}
        <code className={styles.mono}>MainLayout</code>을 지정하는 패턴을
        유지하세요.
      </p>
    </section>
  );
}

AboutPage.getLayout = function getLayout(page) {
  return (
    <MainLayout
      title="About | sotest_0924"
      activeSection="/site"
    >
      {page}
    </MainLayout>
  );
};

export default AboutPage;
